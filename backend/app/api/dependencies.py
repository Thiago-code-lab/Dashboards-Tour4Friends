from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import digest
from app.models.entities import User, UserSession

Session = Annotated[AsyncSession, Depends(get_session, scope="function")]
bearer = HTTPBearer(auto_error=False)


@dataclass
class Principal:
    user: User
    session: UserSession


async def authenticate(
    db: Session, credential: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> Principal:
    if (
        credential is None
        or credential.scheme.lower() != "bearer"
        or len(credential.credentials) > 128
    ):
        raise HTTPException(
            401, "Sessão ausente ou inválida.", headers={"WWW-Authenticate": "Bearer"}
        )
    result = (
        await db.execute(
            select(User, UserSession)
            .join(UserSession, UserSession.user_id == User.id)
            .where(
                UserSession.token_hash == digest(credential.credentials),
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > datetime.now(UTC),
                User.active.is_(True),
            )
        )
    ).first()
    if result is None:
        raise HTTPException(
            401, "Sessão ausente ou inválida.", headers={"WWW-Authenticate": "Bearer"}
        )
    return Principal(user=result[0], session=result[1])


Authenticated = Annotated[Principal, Depends(authenticate)]


def require_roles(*roles: str) -> Callable[[Principal], Awaitable[Principal]]:
    async def authorize(principal: Authenticated) -> Principal:
        if principal.user.role not in roles:
            raise HTTPException(403, "Seu perfil não permite esta operação.")
        return principal

    return authorize


Manager = Annotated[Principal, Depends(require_roles("admin", "manager"))]
Admin = Annotated[Principal, Depends(require_roles("admin"))]


def public_user(user: User) -> dict[str, object]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "active": user.active,
        "version": user.version,
    }
