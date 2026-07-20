"""
Alembic environment configuration for VazhiAI backend.

Key design decisions:
- DATABASE_URL is read from the .env file (never hardcoded)
- All SQLAlchemy models are imported so that `autogenerate` can detect schema changes
- Supports both offline (SQL script) and online (live DB) migration modes
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Make the backend package importable ───────────────────────────────────────
# This ensures Alembic can resolve imports like `from database import Base`
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

# ── Load environment variables from .env ──────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── Import Base and ALL models so autogenerate detects every table ────────────
from database import Base  # noqa: F401 - provides Base.metadata
import db_models           # noqa: F401 - registers all ORM models on Base.metadata

# ── Alembic config object ─────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the DATABASE_URL from the environment
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please configure it in your .env file before running migrations."
    )
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# ── Logging setup ─────────────────────────────────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Target metadata for autogenerate ─────────────────────────────────────────
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This emits SQL statements to stdout without connecting to the database.
    Useful for generating SQL scripts to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,         # Detect column type changes
        compare_server_default=True,  # Detect server default changes
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    Connects to the actual database and applies pending migrations.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Use NullPool to avoid connection leaks in migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,             # Detect column type changes
            compare_server_default=True,   # Detect server default changes
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
