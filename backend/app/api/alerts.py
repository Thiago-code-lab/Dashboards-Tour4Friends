from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select

from app.api.datasets import filters
from app.api.dependencies import Authenticated, Manager, Session
from app.core.database import write_lock
from app.models.entities import AlertStatus, User
from app.repositories.datasets import snapshot
from app.schemas.requests import AlertPatch
from app.services.alerts import derive_alerts
from app.services.audit import record_audit

router = APIRouter(prefix="/alerts", tags=["Alertas"])


async def statuses(db: Session) -> dict[str, dict]:
    rows = await db.execute(
        select(AlertStatus, User.name).join(User, User.id == AlertStatus.updated_by)
    )
    return {
        r.id: {
            "id": r.id,
            "status": r.status,
            "note": r.note,
            "updatedBy": r.updated_by,
            "updatedByName": name,
            "updatedAt": r.updated_at.isoformat(),
            "version": r.version,
        }
        for r, name in rows
    }


@router.get("")
async def get_alerts(
    db: Session, principal: Authenticated, scope: Annotated[dict, Depends(filters)]
) -> dict[str, Any]:
    data = await snapshot(db)
    detected = derive_alerts(data, **scope)
    persisted = await statuses(db)
    active_ids = {a["id"] for a in derive_alerts(data, end=max(d.date for d in data.departures))}
    return {
        "items": [
            {
                **a,
                **persisted.get(a["id"], {"status": "open", "note": "", "version": 0}),
                "conditionActive": True,
                "administrativelyResolved": persisted.get(a["id"], {}).get("status") == "resolved",
            }
            for a in detected
        ],
        "statuses": list(persisted.values()),
        "normalizedIds": [i for i in persisted if i not in active_ids],
    }


@router.patch("/{identifier}/status")
async def patch_alert(
    identifier: str, payload: AlertPatch, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    await write_lock(db)
    data = await snapshot(db)
    # Validate against the complete scenario, not the current dashboard's local filter.
    active = {a["id"] for a in derive_alerts(data, end=max(d.date for d in data.departures))}
    row = await db.get(AlertStatus, identifier)
    if identifier not in active and row is None:
        raise HTTPException(404, "Alerta não corresponde a uma regra detectada.")
    if (row.version if row else 0) != payload.expected_version:
        raise HTTPException(409, "A revisão foi alterada por outra sessão. Recarregue os alertas.")
    before = {"status": row.status, "note": row.note, "version": row.version} if row else None
    if row is None:
        row = AlertStatus(
            id=identifier,
            status=payload.status,
            note=payload.note,
            updated_by=principal.user.id,
            version=1,
        )
        db.add(row)
    else:
        row.status, row.note, row.updated_by = payload.status, payload.note, principal.user.id
        row.version += 1
    row.updated_at = datetime.now(UTC)
    after = {"status": row.status, "note": row.note, "version": row.version}
    record_audit(
        db,
        principal.user.id,
        "alert_statuses",
        identifier,
        "review",
        request.state.request_id,
        before,
        after,
    )
    return {
        "id": identifier,
        **after,
        "updatedBy": row.updated_by,
        "updatedByName": principal.user.name,
        "updatedAt": row.updated_at,
        "conditionActive": identifier in active,
        "administrativelyResolved": payload.status == "resolved" and identifier in active,
    }
