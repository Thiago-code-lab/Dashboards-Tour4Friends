from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings


def database_factory(settings: Settings) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=10,
        isolation_level="SERIALIZABLE",
        connect_args={"connect_timeout": 5, "options": "-c statement_timeout=15000"},
    )
    return async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessions() as session, session.begin():
        yield session


async def write_lock(session: AsyncSession) -> None:
    # One small-agency dataset; serial writes prevent cross-entity validation races.
    await session.execute(text("SELECT pg_advisory_xact_lock(7420642)"))
