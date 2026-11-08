from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select

from app.api.dependencies import Authenticated, Manager, Session
from app.models.entities import AuditEvent, Departure
from app.repositories.datasets import COLLECTIONS, resource
from app.schemas.domain import AllocationData, BookingData, CostData, DepartureData
from app.schemas.requests import AllocationPatch, BookingPatch, CostPatch, DeparturePatch
from app.services.operations import save_resource

router = APIRouter(tags=["Operação"])


async def list_resources(
    db: Session,
    collection: str,
    page: int,
    page_size: int,
    q: str,
    start: date | None,
    end: date | None,
    route_id: str | None,
    status: str | None,
    sort: str,
    direction: str,
) -> dict[str, Any]:
    model, _ = COLLECTIONS[collection]
    fields = {"id": model.id, "version": model.version}
    fields.update(
        {
            key: getattr(model, key)
            for key in ("date", "status", "category", "total_amount", "amount", "capacity")
            if hasattr(model, key)
        }
    )
    if sort not in fields:
        raise HTTPException(422, "Campo de ordenação não permitido.")
    statement = select(model.id)
    if collection == "departures":
        date_field, route_field = model.date, model.route_id
    else:
        statement = statement.join(Departure, Departure.id == model.departure_id)
        date_field, route_field = Departure.date, Departure.route_id
    if start and end and start > end:
        raise HTTPException(422, "Período inválido.")
    if start:
        statement = statement.where(date_field >= start)
    if end:
        statement = statement.where(date_field <= end)
    if route_id:
        statement = statement.where(route_field == route_id)
    if status and hasattr(model, "status"):
        statement = statement.where(model.status == status)
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(model.id.ilike(f"%{escaped}%", escape="\\"))
    total = await db.scalar(select(func.count()).select_from(statement.subquery()))
    order = fields[sort].desc() if direction == "desc" else fields[sort].asc()
    ids = list(
        await db.scalars(
            statement.order_by(order, model.id).offset((page - 1) * page_size).limit(page_size)
        )
    )
    # Snapshot is one fixed-size set of batched queries; never one SELECT per listed row.
    from app.repositories.datasets import snapshot

    dataset = await snapshot(db)
    records = {r.id: r.model_dump(mode="json", by_alias=True) for r in getattr(dataset, collection)}
    versions = (
        dict((await db.execute(select(model.id, model.version).where(model.id.in_(ids)))).all())
        if ids
        else {}
    )
    return {
        "items": [{**records[i], "version": versions[i]} for i in ids],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


def register_list(collection: str) -> None:
    async def listing(
        db: Session,
        principal: Authenticated,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        q: str = Query("", max_length=80),
        start: date | None = None,
        end: date | None = None,
        route_id: str | None = None,
        status: str | None = None,
        sort: str = "id",
        direction: Literal["asc", "desc"] = "asc",
    ) -> dict[str, Any]:
        return await list_resources(
            db, collection, page, page_size, q, start, end, route_id, status, sort, direction
        )

    router.add_api_route(f"/{collection}", listing, methods=["GET"], name=f"list_{collection}")


for collection in ("bookings", "departures", "allocations", "costs"):
    register_list(collection)


@router.get("/bookings/{identifier}/history")
async def booking_history(identifier: str, db: Session, principal: Manager) -> list[dict[str, Any]]:
    await resource(db, "bookings", identifier)
    rows = await db.scalars(
        select(AuditEvent)
        .where(AuditEvent.entity_type == "bookings", AuditEvent.entity_id == identifier)
        .order_by(AuditEvent.id.desc())
        .limit(100)
    )
    return [
        {
            "id": r.id,
            "action": r.action,
            "before": r.before_data,
            "after": r.after_data,
            "actorUserId": r.actor_user_id,
            "occurredAt": r.occurred_at,
            "requestId": r.request_id,
        }
        for r in rows
    ]


@router.get("/bookings/{identifier}")
async def get_booking(identifier: str, db: Session, principal: Authenticated) -> dict[str, Any]:
    return (await resource(db, "bookings", identifier))[1]


@router.post("/bookings", status_code=201)
async def create_booking(
    payload: BookingData, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(db, "bookings", payload, principal.user.id, request.state.request_id)


@router.patch("/bookings/{identifier}")
async def patch_booking(
    identifier: str, payload: BookingPatch, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "bookings", payload, principal.user.id, request.state.request_id, identifier
    )


@router.get("/departures/{identifier}")
async def get_departure(identifier: str, db: Session, principal: Authenticated) -> dict[str, Any]:
    return (await resource(db, "departures", identifier))[1]


@router.post("/departures", status_code=201)
async def create_departure(
    payload: DepartureData, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "departures", payload, principal.user.id, request.state.request_id
    )


@router.patch("/departures/{identifier}")
async def patch_departure(
    identifier: str, payload: DeparturePatch, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "departures", payload, principal.user.id, request.state.request_id, identifier
    )


@router.post("/allocations", status_code=201)
async def create_allocation(
    payload: AllocationData, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "allocations", payload, principal.user.id, request.state.request_id
    )


@router.patch("/allocations/{identifier}")
async def patch_allocation(
    identifier: str, payload: AllocationPatch, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "allocations", payload, principal.user.id, request.state.request_id, identifier
    )


@router.get("/allocations/{identifier}")
async def get_allocation(identifier: str, db: Session, principal: Authenticated) -> dict[str, Any]:
    return (await resource(db, "allocations", identifier))[1]


@router.post("/costs", status_code=201)
async def create_cost(
    payload: CostData, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(db, "costs", payload, principal.user.id, request.state.request_id)


@router.patch("/costs/{identifier}")
async def patch_cost(
    identifier: str, payload: CostPatch, request: Request, db: Session, principal: Manager
) -> dict[str, Any]:
    return await save_resource(
        db, "costs", payload, principal.user.id, request.state.request_id, identifier
    )


@router.get("/costs/{identifier}")
async def get_cost(identifier: str, db: Session, principal: Authenticated) -> dict[str, Any]:
    return (await resource(db, "costs", identifier))[1]
