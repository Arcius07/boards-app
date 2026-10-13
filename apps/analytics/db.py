import os
from urllib.parse import urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

load_dotenv()


def _async_url(url: str) -> str:
    # Prisma URLs look like postgresql://user:pass@host:5432/db?schema=public.
    # asyncpg needs the +asyncpg driver and rejects Prisma's query params.
    parts = urlsplit(url)
    return urlunsplit(("postgresql+asyncpg", parts.netloc, parts.path, "", ""))


_parts = urlsplit(os.environ["DATABASE_URL"])
_local = _parts.hostname in ("localhost", "127.0.0.1")

engine = create_async_engine(
    _async_url(os.environ["DATABASE_URL"]),
    connect_args={} if _local else {"ssl": True},  # Neon requires SSL
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with SessionLocal() as session:
        yield session