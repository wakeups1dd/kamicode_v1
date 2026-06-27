from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from convex import ConvexClient
from config import settings

# --- Legacy SQLAlchemy Config (SQLite) ---
connect_args = {}
if "sqlite" in settings.database_url:
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- New Convex DB Config ---
convex_client = ConvexClient(settings.convex_url) if settings.convex_url else None

def get_convex():
    if not convex_client:
        raise Exception("CONVEX_URL is not set")
    return convex_client
