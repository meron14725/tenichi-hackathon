"""auth API エンドポイントの統合テスト."""

import pytest

from tests.conftest import REGISTER_DATA, register_user


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

    async def test_register_short_password(self, client):
        short_pw_data = {**REGISTER_DATA, "email": "short@example.com", "password": "short"}
        response = await client.post("/api/v1/auth/register", json=short_pw_data)
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client):
        await register_user(client)
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "Password123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["expires_in"] > 0

    async def test_login_wrong_password(self, client):
        await register_user(client)
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    async def test_login_nonexistent_email(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "Password123"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefresh:
    async def test_refresh_success(self, client):
        tokens = await register_user(client)
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
    async def test_logout_success(self, client):
        tokens = await register_user(client)
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 204

    async def test_logout_without_token(self, client):
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 403  # HTTPBearer returns 403 when no token
