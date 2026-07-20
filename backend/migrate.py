"""
migrate.py — Run Alembic migrations standalone, BEFORE starting uvicorn.

Usage:
    python migrate.py            # Upgrade to latest migration (default)
    python migrate.py upgrade    # Same as above
    python migrate.py downgrade  # Roll back one migration
    python migrate.py current    # Show current migration revision
    python migrate.py history    # Show migration history

This script should be run from E:/VazhiAI_v2_broad/backend/ directory.
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from alembic.config import Config
from alembic import command

def run():
    alembic_cfg = Config("alembic.ini")

    action = sys.argv[1] if len(sys.argv) > 1 else "upgrade"

    if action == "upgrade":
        print("Running: alembic upgrade head ...")
        command.upgrade(alembic_cfg, "head")
        try:
            import database
            print("Running database fallback checks (create_tables)...")
            database.create_tables()
            print("✓ Fallback database checks completed.")
        except Exception as e:
            print(f"Warning: Fallback database checks failed: {e}")
        print("✓ Database is up to date.")

    elif action == "downgrade":
        print("Running: alembic downgrade -1 ...")
        command.downgrade(alembic_cfg, "-1")
        print("✓ Rolled back one revision.")

    elif action == "current":
        command.current(alembic_cfg)

    elif action == "history":
        command.history(alembic_cfg, verbose=True)

    else:
        print(f"Unknown action: {action}")
        print("Usage: python migrate.py [upgrade|downgrade|current|history]")
        sys.exit(1)

if __name__ == "__main__":
    run()
