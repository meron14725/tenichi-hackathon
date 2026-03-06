"""schedules API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers

SCHEDULE_DATA = {
    "title": "会食",
    "start_at": "2026-03-10T19:00:00",
    "end_at": "2026-03-10T21:00:00",
    "destination_name": "銀座 鮨さいとう",
    "destination_address": "東京都中央区銀座",
    "travel_mode": "transit",
    "memo": "手土産を持参",
    "tag_ids": [2],
}


async def _create_schedule(client, headers, data=None):
    return await client.post("/api/v1/schedules", headers=headers, json=data or SCHEDULE_DATA)


@pytest.mark.asyncio
class TestCreateSchedule:
    async def test_create_success(self, client):
        headers = await auth_headers(client)
        response = await _create_schedule(client, headers)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "会食"
        assert data["travel_mode"] == "transit"
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "会食"
        assert data["selected_route"] is None

    async def test_create_with_invalid_tag(self, client):
        headers = await auth_headers(client)
        data = {**SCHEDULE_DATA, "tag_ids": [999]}
        response = await _create_schedule(client, headers, data)
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_create_without_token(self, client):
        response = await client.post("/api/v1/schedules", json=SCHEDULE_DATA)
        assert response.status_code == 403


@pytest.mark.asyncio
class TestListSchedules:
    async def test_list_empty(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/schedules", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_with_data(self, client):
        headers = await auth_headers(client)
        await _create_schedule(client, headers)
        response = await client.get("/api/v1/schedules", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    async def test_list_with_date_filter(self, client):
        headers = await auth_headers(client)
        await _create_schedule(client, headers)
        # Within range
        response = await client.get("/api/v1/schedules?start_date=2026-03-10&end_date=2026-03-10", headers=headers)
        assert len(response.json()) == 1
        # Outside range
        response = await client.get("/api/v1/schedules?start_date=2026-03-11&end_date=2026-03-11", headers=headers)
        assert len(response.json()) == 0


@pytest.mark.asyncio
class TestGetSchedule:
    async def test_get_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_schedule(client, headers)
        schedule_id = create_resp.json()["id"]
        response = await client.get(f"/api/v1/schedules/{schedule_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["title"] == "会食"

    async def test_get_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/schedules/999", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestUpdateSchedule:
    async def test_update_partial(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_schedule(client, headers)
        schedule_id = create_resp.json()["id"]
        response = await client.put(
            f"/api/v1/schedules/{schedule_id}",
            headers=headers,
            json={"title": "更新済み", "tag_ids": [1, 3]},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "更新済み"
        assert len(data["tags"]) == 2

    async def test_update_with_invalid_tag(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_schedule(client, headers)
        schedule_id = create_resp.json()["id"]
        response = await client.put(
            f"/api/v1/schedules/{schedule_id}",
            headers=headers,
            json={"tag_ids": [999]},
        )
        assert response.status_code == 400

    async def test_update_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.put("/api/v1/schedules/999", headers=headers, json={"title": "x"})
        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeleteSchedule:
    async def test_delete_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_schedule(client, headers)
        schedule_id = create_resp.json()["id"]
        response = await client.delete(f"/api/v1/schedules/{schedule_id}", headers=headers)
        assert response.status_code == 204
        # Verify deleted
        response = await client.get(f"/api/v1/schedules/{schedule_id}", headers=headers)
        assert response.status_code == 404

    async def test_delete_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.delete("/api/v1/schedules/999", headers=headers)
        assert response.status_code == 404
