import sys
import os

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Disable rate limits AND force non-secure cookies BEFORE importing the main app.
# DISABLE_RATE_LIMIT: prevents 429 errors during test signup/login calls.
# COOKIE_SECURE=false: httpx TestClient uses plain http://testserver, so
#   cookies with Secure flag would be silently dropped; setting this to false
#   ensures Set-Cookie works and the auth cookie is replayed on every request.
os.environ["DISABLE_RATE_LIMIT"] = "true"
os.environ["COOKIE_SECURE"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import database
from main import app

# ── SQLite test database ───────────────────────────────────────────────────────
# We use SQLite for speed & isolation. SQLite doesn't support all PostgreSQL
# DDL, so we rely solely on SQLAlchemy ORM metadata (Base.metadata.create_all)
# to create tables — which produces valid, portable SQL.

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable FK enforcement on SQLite (off by default)
@event.listens_for(engine, "connect")
def enable_foreign_keys(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redirect module-level engine/SessionLocal to the test SQLite DB.
# This ensures background tasks that call `database.SessionLocal()` also
# use the test DB.
database.engine = engine
database.SessionLocal = TestingSessionLocal


# ── Session-scoped: create tables once ───────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """
    Create all ORM tables at the start of the test session and drop them
    at the end.  We intentionally skip `database.create_tables()` because
    those migrations contain PostgreSQL-specific DDL (IF NOT EXISTS on ALTER,
    TIMESTAMP WITH TIME ZONE, etc.) that SQLite does not support.
    SQLAlchemy's `Base.metadata.create_all` generates portable DDL from
    the model definitions and is the correct approach here.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_temp.db"):
        try:
            os.remove("test_temp.db")
        except Exception:
            pass


# ── Function-scoped: rolled-back transaction per test ────────────────────────

@pytest.fixture
def db_session():
    """
    Each test runs inside a transaction that is rolled back at the end,
    so tests are completely isolated from each other.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """
    TestClient backed by the per-test rolled-back DB session.
    Cookies (access_token / refresh_token) set by one request are automatically
    carried to subsequent requests within the same test function.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
