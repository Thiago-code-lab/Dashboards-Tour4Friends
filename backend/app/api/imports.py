from typing import Any

from fastapi import APIRouter, File, Query, Request, UploadFile
from sqlalchemy import func, select

from app.api.dependencies import Admin, Session
from app.models.entities import ImportBatch
from app.schemas.requests import CommitImport
from app.services.imports import commit_import, validate_import

router = APIRouter(prefix="/imports", tags=["Importação"])


@router.post("/bookings/validate", status_code=201)
async def validate_bookings(
    db: Session, principal: Admin, file: UploadFile = File()
) -> dict[str, Any]:
    content = await file.read(1_048_577)
    await file.close()
    return await validate_import(db, content, principal.user.id)


@router.post("/bookings/commit")
async def apply_bookings(
    payload: CommitImport, request: Request, db: Session, principal: Admin
) -> dict[str, Any]:
    return await commit_import(
        db, payload.batch_id, payload.validation_token, principal.user.id, request.state.request_id
    )


@router.get("")
async def batches(
    db: Session,
    principal: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    rows = await db.scalars(
        select(ImportBatch)
        .order_by(ImportBatch.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [
            {
                "id": r.id,
                "status": r.status,
                "rowCount": r.row_count,
                "createdAt": r.created_at,
                "committedAt": r.committed_at,
                "actorUserId": r.actor_user_id,
            }
            for r in rows
        ],
        "total": await db.scalar(select(func.count()).select_from(ImportBatch)),
        "page": page,
        "pageSize": page_size,
    }
