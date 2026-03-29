# -----------------------------------------------------------------------------
# database.py — Database Connection
# -----------------------------------------------------------------------------
# This file sets up the connection to our PostgreSQL database.
# Think of it like opening a phone line between the app and the database.
#
# Key things it provides:
#   - `engine`         → the actual connection pool to Postgres
#   - `Base`           → parent class that every DB table model must inherit from
#   - `get_db()`       → injected into API routes that need to read/write DB.
#                        Opens a session for the request, then auto-closes it.
# -----------------------------------------------------------------------------

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# Async engine — connects to Postgres via asyncpg driver
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,           # set True to log all SQL queries for debugging
    pool_size=5,
    max_overflow=10,
)

# Session factory — used in FastAPI route dependencies
AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    """All SQLAlchemy ORM models inherit from this."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session, auto-closes after request."""
    async with AsyncSessionLocal() as session:
        yield session
