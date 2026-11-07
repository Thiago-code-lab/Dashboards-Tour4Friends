from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.dependencies import Authenticated, Session
from app.repositories.datasets import snapshot
from app.schemas.domain import Category, Dataset, Modality
from app.services.analytics import analyze_dataset

router = APIRouter(tags=["Dados e indicadores"])


@router.get("/dataset", response_model=Dataset)
async def get_dataset(db: Session, principal: Authenticated) -> Dataset:
    return await snapshot(db, validate=True)


@router.get("/dataset/metadata")
async def metadata(db: Session, principal: Authenticated) -> dict[str, Any]:
    data = await snapshot(db)
    return {
        **data.metadata.model_dump(mode="json", by_alias=True),
        "source": "postgresql",
        "counts": {
            name: len(getattr(data, name)) for name in type(data).model_fields if name != "metadata"
        },
    }


def filters(
    start: date | None = None,
    end: date | None = None,
    route_id: str | None = None,
    modality: Modality | None = None,
    category: Category | None = None,
) -> dict:
    return {
        "start": start,
        "end": end,
        "route_id": route_id,
        "modality": modality,
        "category": category,
    }


def register_analytics(name: str) -> None:
    async def dashboard(
        db: Session, principal: Authenticated, scope: Annotated[dict, Depends(filters)]
    ) -> dict[str, Any]:
        return analyze_dataset(await snapshot(db), **scope)

    router.add_api_route(f"/analytics/{name}", dashboard, methods=["GET"], name=f"analytics_{name}")


for module in ("overview", "demand", "capacity", "satisfaction", "financial"):
    register_analytics(module)
