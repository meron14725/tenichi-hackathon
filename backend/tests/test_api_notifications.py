"""notifications API エンドポイントの統合テスト."""

import pytest

from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestGetNotificationSettings:
    async def test_get_settings_success(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/notifications/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["weather_enabled"] is True
        assert data["weather_notify_time"] == "07:00"
        assert data["reminder_enabled"] is True

    async def test_get_settings_without_token(self, client):
        response = await client.get("/api/v1/notifications/settings")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateNotificationSettings:
    async def test_update_partial(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={"weather_enabled": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["weather_enabled"] is False
        assert data["reminder_enabled"] is True  # unchanged

    async def test_update_weather_notify_time(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={"weather_notify_time": "08:30"},
        )
        assert response.status_code == 200
        assert response.json()["weather_notify_time"] == "08:30"

    async def test_update_empty_body(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={},
        )
        assert response.status_code == 200
        assert response.json()["weather_notify_time"] == "07:00"

    async def test_update_invalid_time_format(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={"weather_notify_time": "abc"},
        )
        assert response.status_code == 422

    async def test_update_invalid_time_value(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={"weather_notify_time": "25:99"},
        )
        assert response.status_code == 422

    async def test_update_null_time(self, client):
        headers = await auth_headers(client)
        response = await client.put(
            "/api/v1/notifications/settings",
            headers=headers,
            json={"weather_notify_time": None},
        )
        assert response.status_code == 422

    async def test_update_without_token(self, client):
        response = await client.put(
            "/api/v1/notifications/settings",
            json={"weather_enabled": False},
        )
        assert response.status_code == 403


@pytest.mark.asyncio
class TestRegisterDeviceToken:
    async def test_register_token_success(self, client):
        headers = await auth_headers(client)
        response = await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "fcm-token-abc123", "platform": "ios"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["token"] == "fcm-token-abc123"
        assert data["platform"] == "ios"
        assert "id" in data
        assert "created_at" in data

    async def test_register_same_token_same_user(self, client):
        headers = await auth_headers(client)
        await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "dup-token", "platform": "ios"},
        )
        response = await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "dup-token", "platform": "ios"},
        )
        assert response.status_code == 201
        assert response.json()["token"] == "dup-token"

    async def test_register_token_switch_user(self, client):
        headers_a = await auth_headers(client, email="switch_a@example.com")
        await client.post(
            "/api/v1/notifications/tokens",
            headers=headers_a,
            json={"token": "shared-device-token", "platform": "ios"},
        )
        headers_b = await auth_headers(client, email="switch_b@example.com")
        response = await client.post(
            "/api/v1/notifications/tokens",
            headers=headers_b,
            json={"token": "shared-device-token", "platform": "ios"},
        )
        assert response.status_code == 201
        assert response.json()["token"] == "shared-device-token"

    async def test_register_empty_token(self, client):
        headers = await auth_headers(client)
        response = await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "", "platform": "ios"},
        )
        assert response.status_code == 422

    async def test_register_invalid_platform(self, client):
        headers = await auth_headers(client)
        response = await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "some-token", "platform": "web"},
        )
        assert response.status_code == 422

    async def test_register_without_token(self, client):
        response = await client.post(
            "/api/v1/notifications/tokens",
            json={"token": "abc", "platform": "ios"},
        )
        assert response.status_code == 403


@pytest.mark.asyncio
class TestDeleteDeviceToken:
    async def test_delete_token_success(self, client):
        headers = await auth_headers(client)
        await client.post(
            "/api/v1/notifications/tokens",
            headers=headers,
            json={"token": "delete-me", "platform": "ios"},
        )
        response = await client.delete(
            "/api/v1/notifications/tokens/delete-me",
            headers=headers,
        )
        assert response.status_code == 204

    async def test_delete_nonexistent_token(self, client):
        headers = await auth_headers(client)
        response = await client.delete(
            "/api/v1/notifications/tokens/nonexistent",
            headers=headers,
        )
        assert response.status_code == 404

    async def test_delete_other_users_token(self, client):
        headers_a = await auth_headers(client, email="user_a@example.com")
        await client.post(
            "/api/v1/notifications/tokens",
            headers=headers_a,
            json={"token": "user-a-token", "platform": "ios"},
        )
        headers_b = await auth_headers(client, email="user_b@example.com")
        response = await client.delete(
            "/api/v1/notifications/tokens/user-a-token",
            headers=headers_b,
        )
        assert response.status_code == 404

    async def test_delete_without_token(self, client):
        response = await client.delete("/api/v1/notifications/tokens/some-token")
        assert response.status_code == 403
