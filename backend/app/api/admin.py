from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select, update
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import Admin, Session, public_user
from app.core.database import write_lock
from app.core.security import hash_password
from app.models.entities import AuditEvent, User, UserSession
from app.schemas.requests import UserCreate, UserPatch
from app.services.audit import record_audit

router = APIRouter(prefix="/admin", tags=["Administração"])


@router.get("/users")
async def users(
    db: Session,
    principal: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    rows = await db.scalars(
        select(User)
        .order_by(User.created_at, User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [public_user(u) for u in rows],
        "total": await db.scalar(select(func.count()).select_from(User)),
        "page": page,
        "pageSize": page_size,
    }


@router.post("/users", status_code=201)
async def create_user(
    payload: UserCreate, request: Request, db: Session, principal: Admin
) -> dict[str, Any]:
    await write_lock(db)
    if await db.scalar(select(User.id).where(User.email == payload.email)):
        raise HTTPException(409, "Não foi possível criar um usuário com esses dados.")
    user = User(
        id=str(uuid4()),
        email=payload.email,
        name=payload.name,
        role=payload.role,
        active=True,
        password_hash=await run_in_threadpool(hash_password, payload.password.get_secret_value()),
    )
    db.add(user)
    await db.flush()
    record_audit(
        db,
        principal.user.id,
        "users",
        user.id,
        "create",
        request.state.request_id,
        after={"role": user.role, "active": True},
    )
    return public_user(user)


@router.patch("/users/{identifier}")
async def patch_user(
    identifier: str, payload: UserPatch, request: Request, db: Session, principal: Admin
) -> dict[str, Any]:
    await write_lock(db)
    user = await db.get(User, identifier)
    if user is None:
        raise HTTPException(404, "Usuário não encontrado.")
    if user.version != payload.expected_version:
        raise HTTPException(409, "Usuário alterado por outra sessão.")
    patch = payload.model_dump(exclude_unset=True, exclude={"expected_version"})
    if any(value is None for value in patch.values()):
        raise HTTPException(422, "Perfil e estado ativo não podem ser nulos.")
    if (
        user.role == "admin"
        and user.active
        and (patch.get("active") is False or patch.get("role", "admin") != "admin")
    ):
        count = await db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.active.is_(True), User.role == "admin")
        )
        if count <= 1:
            raise HTTPException(409, "Mantenha pelo menos um administrador ativo.")
    before = {"role": user.role, "active": user.active}
    for key, value in patch.items():
        setattr(user, key, value)
    user.version += 1
    # Revocation also applies to role changes, preventing stale privileges.
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == identifier, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    record_audit(
        db,
        principal.user.id,
        "users",
        user.id,
        "update",
        request.state.request_id,
        before,
        {"role": user.role, "active": user.active},
    )
    return public_user(user)


@router.get("/audit")
async def audit(
    db: Session,
    principal: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> dict[str, Any]:
    statement = select(AuditEvent)
    if entity_type:
        statement = statement.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        statement = statement.where(AuditEvent.entity_id == entity_id)
    total = await db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = await db.scalars(
        statement.order_by(AuditEvent.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return {
        "items": [
            {
                "id": r.id,
                "actorUserId": r.actor_user_id,
                "entityType": r.entity_type,
                "entityId": r.entity_id,
                "action": r.action,
                "beforeData": r.before_data,
                "afterData": r.after_data,
                "occurredAt": r.occurred_at,
                "requestId": r.request_id,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }
