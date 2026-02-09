"""Async SQLAlchemy engine + session factory.

Connects to the same PostgreSQL database that Prisma manages.
This service only performs **read-only** queries — Prisma owns the schema.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import DATABASE_URL

# Prisma uses `postgresql://…` but asyncpg needs `postgresql+asyncpg://…`
_url = DATABASE_URL
if _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _url,
    echo=False,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Verify we can connect (called at startup)."""
    async with engine.begin() as conn:
        await conn.execute(  # type: ignore[arg-type]
            __import__("sqlalchemy").text("SELECT 1")
        )


async def close_db() -> None:
    await engine.dispose()
