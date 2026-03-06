"""users API エンドポイントの統合テスト."""

import pytest

from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestGetProfile:
    async def test_get_profile_success(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "id" in data
        assert "created_at" in data

    async def test_get_profile_without_token(self, client):
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateProfile:
    async def test_update_name(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/users/me",
            headers=headers,
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_update_empty_body(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/users/me",
            headers=headers,
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
        headers = await auth_headers(client)
        response = await client.get("/api/v1/users/me/settings", headers=headers)
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
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/users/me/settings",
            headers=headers,
            json={"preparation_minutes": 45, "home_address": "東京都新宿区"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preparation_minutes"] == 45
        assert data["home_address"] == "東京都新宿区"
        assert data["reminder_minutes_before"] == 15  # unchanged

    async def test_update_empty_body(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/users/me/settings",
            headers=headers,
            json={},
        )
        assert response.status_code == 200
        assert response.json()["preparation_minutes"] == 30

    async def test_update_without_token(self, client):
        response = await client.put("/api/v1/users/me/settings", json={"preparation_minutes": 10})
        assert response.status_code == 403
