"""テスト共通フィクスチャ — SQLite + TestClient."""

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models.base import Base

# テスト用 SQLite（インメモリ）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """テストごとにテーブルを作成・削除."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def override_get_db() -> AsyncGenerator[AsyncSession]:
    """テスト用の DB セッション."""
    async with TestSessionLocal() as session:
        yield session


# FastAPI の依存関係を上書き
app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient]:
    """httpx AsyncClient（FastAPI TestClient 相当）."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
