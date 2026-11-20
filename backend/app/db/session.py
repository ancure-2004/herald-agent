from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

from app.core.config import get_settings

settings = get_settings()

db_url = settings.normalized_database_url
is_sqlite = db_url.startswith("sqlite")

if is_sqlite:
    connect_args = {"check_same_thread": False}
    # Use StaticPool for in-memory SQLite, NullPool for file-based SQLite
    is_memory = ":memory:" in db_url or db_url in ("sqlite://", "sqlite:///")
    pool_kwargs = {
        "poolclass": StaticPool if is_memory else NullPool,
    }
else:
    connect_args = {
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    pool_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,
    }

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    **pool_kwargs,
)

if is_sqlite:

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that yields a managed SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
