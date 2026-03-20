"""テスト共通フィクスチャ — PostgreSQL + TestClient."""

import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.tag import Tag
from app.models.template import Category

# テスト用 PostgreSQL（環境変数 or docker-compose のデフォルト）
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://tenichi:tenichi@localhost:5432/tenichi",
)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """テストごとにテーブルを作成・削除."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Seed tags and template categories
    async with session_factory() as session:
        for name in ["仕事", "会食", "デート", "運動"]:
            session.add(Tag(name=name))
        for name in ["休日", "旅行", "仕事", "出張"]:
            session.add(Category(name=name))
        await session.commit()

    # FastAPI の依存関係を上書き
    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient]:
    """httpx AsyncClient（FastAPI TestClient 相当）."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# --- 共通テストヘルパー ---

REGISTER_DATA = {
    "email": "test@example.com",
    "password": "Password123",
    "name": "Test User",
    "home_address": "東京都渋谷区",
    "home_lat": 35.6584,
    "home_lon": 139.7015,
    "preparation_minutes": 30,
    "reminder_minutes_before": 15,
}


async def register_user(client: AsyncClient, email: str | None = None) -> dict:
    """テストユーザーを登録し、レスポンス全体を返す."""
    data = {**REGISTER_DATA}
    if email:
        data["email"] = email
    response = await client.post("/api/v1/auth/register", json=data)
    assert response.status_code == 201
    return response.json()


async def auth_headers(client: AsyncClient, email: str | None = None) -> dict:
    """テストユーザーを登録し、認証ヘッダーを返す."""
    result = await register_user(client, email)
    return {"Authorization": f"Bearer {result['access_token']}"}
