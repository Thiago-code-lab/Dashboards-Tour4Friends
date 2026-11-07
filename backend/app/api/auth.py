from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, text
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import Authenticated, Session, public_user
from app.core.security import digest, dummy_hash, new_token, verify_password
from app.models.entities import AuditEvent, User, UserSession
from app.schemas.requests import LoginRequest
from app.schemas.responses import LoginResponse, PublicUser
from app.services.audit import record_audit

router = APIRouter(prefix="/auth", tags=["Sessões"])


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest, request: Request, db: Session
) -> dict[str, Any] | JSONResponse:
    settings = request.app.state.settings
    ip_hash = digest(request.client.host if request.client else "unknown")
    identity_hash = digest(payload.email)
    # Serialize the rate-limit check per IP; no raw addresses or credentials are stored.
    await db.connection(execution_options={"isolation_level": "READ COMMITTED"})
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:bucket))"), {"bucket": ip_hash})
    since = datetime.now(UTC) - timedelta(seconds=settings.login_window_seconds)
    attempts = await db.scalar(
        select(func.count())
        .select_from(AuditEvent)
        .where(
            AuditEvent.action == "auth.login_failed",
            AuditEvent.occurred_at >= since,
            or_(
                AuditEvent.entity_id == identity_hash,
                AuditEvent.after_data["ip_hash"].as_string() == ip_hash,
            ),
        )
    )
    if attempts >= settings.login_limit:
        return JSONResponse(
            status_code=429,
            content={"detail": "Limite de tentativas. Aguarde antes de tentar novamente."},
            headers={"Retry-After": str(settings.login_window_seconds)},
        )
    user = await db.scalar(select(User).where(User.email == payload.email))
    valid = await run_in_threadpool(
        verify_password,
        user.password_hash if user else dummy_hash,
        payload.password.get_secret_value(),
    )
    if user is None or not valid or not user.active:
        record_audit(
            db,
            None,
            "auth",
            identity_hash,
            "auth.login_failed",
            request.state.request_id,
            after={"ip_hash": ip_hash},
        )
        return JSONResponse(status_code=401, content={"detail": "Credenciais inválidas."})
    token, token_hash = new_token()
    expires = datetime.now(UTC) + timedelta(minutes=settings.session_minutes)
    db.add(UserSession(id=str(uuid4()), user_id=user.id, token_hash=token_hash, expires_at=expires))
    record_audit(db, user.id, "auth", user.id, "auth.login", request.state.request_id)
    return {
        "accessToken": token,
        "tokenType": "bearer",
        "expiresAt": expires,
        "user": public_user(user),
    }


@router.get("/me", response_model=PublicUser)
async def me(principal: Authenticated) -> dict[str, object]:
    return public_user(principal.user)


@router.post("/logout", status_code=204)
async def logout(request: Request, principal: Authenticated, db: Session) -> None:
    principal.session.revoked_at = datetime.now(UTC)
    record_audit(
        db, principal.user.id, "auth", principal.user.id, "auth.logout", request.state.request_id
    )
