"""users API エンドポイントの統合テスト."""

import pytest

REGISTER_DATA = {
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User",
    "home_address": "東京都渋谷区",
    "home_lat": 35.6584,
    "home_lon": 139.7015,
    "preparation_minutes": 30,
    "reminder_minutes_before": 15,
}


async def _register_and_get_token(client) -> str:
    response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
class TestGetProfile:
    async def test_get_profile_success(self, client):
        token = await _register_and_get_token(client)
        response = await client.get("/api/v1/users/me", headers=_auth_headers(token))
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "user@example.com"
        assert data["name"] == "Test User"
        assert "id" in data
        assert "created_at" in data

    async def test_get_profile_without_token(self, client):
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateProfile:
    async def test_update_name(self, client):
        token = await _register_and_get_token(client)
        response = await client.put(
            "/api/v1/users/me",
            headers=_auth_headers(token),
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_update_empty_body(self, client):
        token = await _register_and_get_token(client)
        response = await client.put(
            "/api/v1/users/me",
            headers=_auth_headers(token),
            json={},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Test User"

    async def test_update_without_token(self, client):
        response = await client.put("/api/v1/users/me", json={"name": "X"})
        assert response.status_code == 403


@pytest.mark.asyncio
class TestGetSettings:
    async def test_get_settings_success(self, client):
        token = await _register_and_get_token(client)
        response = await client.get("/api/v1/users/me/settings", headers=_auth_headers(token))
        assert response.status_code == 200
        data = response.json()
        assert data["home_address"] == "東京都渋谷区"
        assert data["preparation_minutes"] == 30
        assert data["reminder_minutes_before"] == 15
        assert data["timezone"] == "Asia/Tokyo"

    async def test_get_settings_without_token(self, client):
        response = await client.get("/api/v1/users/me/settings")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateSettings:
    async def test_update_partial(self, client):
        token = await _register_and_get_token(client)
        response = await client.put(
            "/api/v1/users/me/settings",
            headers=_auth_headers(token),
            json={"preparation_minutes": 45, "home_address": "東京都新宿区"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preparation_minutes"] == 45
        assert data["home_address"] == "東京都新宿区"
        assert data["reminder_minutes_before"] == 15  # unchanged

    async def test_update_empty_body(self, client):
        token = await _register_and_get_token(client)
        response = await client.put(
            "/api/v1/users/me/settings",
            headers=_auth_headers(token),
            json={},
        )
        assert response.status_code == 200
        assert response.json()["preparation_minutes"] == 30

    async def test_update_without_token(self, client):
        response = await client.put("/api/v1/users/me/settings", json={"preparation_minutes": 10})
        assert response.status_code == 403
