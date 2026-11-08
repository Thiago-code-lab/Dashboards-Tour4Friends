import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError, SQLAlchemyError

from app.api import admin, alerts, auth, datasets, imports, resources
from app.core.config import Settings, get_settings
from app.core.database import database_factory
from app.core.logging import RequestGuards, configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    configuration = settings or get_settings()
    sessions = database_factory(configuration)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        yield
        await sessions.kw["bind"].dispose()

    application = FastAPI(
        title="T4F Performance · laboratório sintético",
        version="2.0.0",
        lifespan=lifespan,
        description="API autenticada de dados sintéticos persistidos no PostgreSQL. Tokens de sessão são opacos, expiram e são revogáveis.",
    )
    application.state.settings, application.state.sessions = configuration, sessions
    application.add_middleware(RequestGuards, settings=configuration)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    for router in (
        auth.router,
        datasets.router,
        resources.router,
        alerts.router,
        imports.router,
        admin.router,
    ):
        application.include_router(router, prefix="/api/v1")

    @application.get("/health", tags=["Sistema"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/ready", tags=["Sistema"])
    async def ready() -> JSONResponse:
        try:
            async with sessions() as session:
                version = await session.scalar(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                )
                seeded = await session.scalar(text("SELECT id FROM dataset_metadata WHERE id = 1"))
                if version and seeded:
                    return JSONResponse({"status": "ready"})
        except SQLAlchemyError:
            pass  # Readiness failure is returned explicitly, without DB internals.
        return JSONResponse(status_code=503, content={"status": "not_ready"})

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"path": list(e["loc"]), "message": e["msg"], "type": e["type"]}
                    for e in error.errors()
                ]
            },
        )

    @application.exception_handler(IntegrityError)
    async def integrity_error(request: Request, error: IntegrityError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": "A operação conflita com a integridade ou uma atualização concorrente.",
                "requestId": request.state.request_id,
            },
        )

    @application.exception_handler(DBAPIError)
    async def database_error(request: Request, error: DBAPIError) -> JSONResponse:
        conflict = getattr(error.orig, "sqlstate", "") in ("40001", "40P01")
        return JSONResponse(
            status_code=409 if conflict else 503,
            content={
                "detail": "Atualização concorrente. Recarregue e tente novamente."
                if conflict
                else "Banco temporariamente indisponível.",
                "requestId": request.state.request_id,
            },
        )

    @application.exception_handler(Exception)
    async def internal_error(request: Request, error: Exception) -> JSONResponse:
        logging.getLogger("t4f.errors").error(
            json.dumps(
                {
                    "event": "internal_error",
                    "request_id": request.state.request_id,
                    "type": type(error).__name__,
                }
            )
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Falha interna controlada.", "requestId": request.state.request_id},
        )

    return application


app = create_app()
