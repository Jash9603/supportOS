# -----------------------------------------------------------------------------
# migrations/env.py — Alembic Migration Runner
# -----------------------------------------------------------------------------
# This is the script Alembic runs when you do `alembic upgrade head` or
# `alembic revision --autogenerate`.
#
# Key jobs:
#   1. Connects to the database (using the same async engine as the app)
#   2. Loads all our models (so Alembic knows what tables should exist)
#   3. Compares models vs. actual DB schema and generates SQL to fix differences
#
# The async pattern here is important:
#   - We use asyncio.run() (NOT the deprecated get_event_loop())
#   - We use `async with engine.connect()` (NOT .then() which is JS syntax)
# -----------------------------------------------------------------------------

import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import AsyncConnection
from alembic import context

# Import our async engine from the app (same engine the app uses)
from core.database import engine, Base

# Import ALL models so Alembic can detect every table.
# If you skip importing a model here, Alembic will not see it.
import models  # noqa: F401 — this triggers models/__init__.py which imports all models

# Alembic reads log settings from alembic.ini
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This tells Alembic what the DB *should* look like (from our ORM models)
target_metadata = Base.metadata


# ── Offline mode (generates SQL without a live DB connection) ────────────────
def run_migrations_offline() -> None:
    """Run migrations without connecting to DB — produces raw SQL output."""
    url = engine.url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Sync helper called inside async connection ───────────────────────────────
def do_run_migrations(connection) -> None:
    """
    Called by run_async_migrations via connection.run_sync().
    This is the synchronous part that actually applies the migration SQL.
    """
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connects to a real DB and applies migrations) ───────────────
def run_migrations_online() -> None:
    """
    Run migrations against a live database.
    Uses asyncio.run() — NOT the deprecated get_event_loop().
    Uses async with engine.connect() — NOT .then() (that's JavaScript syntax).
    """
    async def run_async_migrations() -> None:
        async with engine.connect() as connection:
            # run_sync bridges the async connection into the sync Alembic context
            await connection.run_sync(do_run_migrations)
        # Dispose engine after migrations to release connection pool
        await engine.dispose()

    asyncio.run(run_async_migrations())


# ── Entry point ──────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
