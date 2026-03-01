"""Database connection — SQLAlchemy async + optional Supabase client."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://mentora_user:mentora_pass@localhost:5432/mentora"
)

# Convert sync postgres:// → async postgresql+asyncpg://
ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace(
    "postgres://", "postgresql+asyncpg://"
)

engine = create_async_engine(ASYNC_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Run schema.sql on startup if tables don't exist yet."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if not os.path.exists(schema_path):
        return
    try:
        async with engine.begin() as conn:
            with open(schema_path) as f:
                sql = f.read()
            # Execute statement by statement
            for stmt in sql.split(";"):
                stmt = stmt.strip()
                if stmt:
                    await conn.execute(text(stmt))
        print("✅ Database schema initialised")
    except Exception as e:
        print(f"⚠️  DB init warning (may already exist): {e}")
