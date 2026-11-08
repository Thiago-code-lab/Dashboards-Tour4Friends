from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import AuditEvent


def record_audit(
    session: AsyncSession,
    actor: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    request_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditEvent(
            actor_user_id=actor,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_data=before,
            after_data=after,
            request_id=request_id,
        )
    )
