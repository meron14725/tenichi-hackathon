"""auth API エンドポイントの統合テスト."""

import pytest

REGISTER_DATA = {
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "home_address": "東京都渋谷区",
    "home_lat": 35.6584,
    "home_lon": 139.7015,
    "preparation_minutes": 30,
    "reminder_minutes_before": 15,
}


@pytest.mark.asyncio
class TestRegister:
    async def test_register_success(self, client):
        response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
        assert response.status_code == 201

        data = response.json()
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["name"] == "Test User"
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["expires_in"] > 0

    async def test_register_duplicate_email(self, client):
        # 1回目: 成功
        await client.post("/api/v1/auth/register", json=REGISTER_DATA)
        # 2回目: 重複エラー
        response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "CONFLICT"

    async def test_register_invalid_email(self, client):
        invalid_data = {**REGISTER_DATA, "email": "not-an-email"}
        response = await client.post("/api/v1/auth/register", json=invalid_data)
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def _register(self, client):
        await client.post("/api/v1/auth/register", json=REGISTER_DATA)

    async def test_login_success(self, client):
        await self._register(client)
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["expires_in"] > 0

    async def test_login_wrong_password(self, client):
        await self._register(client)
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    async def test_login_nonexistent_email(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "password123"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefresh:
    async def _register_and_get_tokens(self, client) -> dict:
        response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
        return response.json()

    async def test_refresh_success(self, client):
        tokens = await self._register_and_get_tokens(client)
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["expires_in"] > 0

    async def test_refresh_invalid_token(self, client):
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestLogout:
    async def _register_and_get_tokens(self, client) -> dict:
        response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
        return response.json()

    async def test_logout_success(self, client):
        tokens = await self._register_and_get_tokens(client)
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 204

    async def test_logout_without_token(self, client):
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 403  # HTTPBearer returns 403 when no token
