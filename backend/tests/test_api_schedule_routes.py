"""schedule_routes API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers

SCHEDULE_DATA = {
    "title": "会食",
    "start_at": "2026-03-10T19:00:00",
}

ROUTE_DATA = {
    "route_data": {
        "legs": [
            {
                "mode": "WALK",
                "from_name": "出発地",
                "to_name": "渋谷駅",
                "duration_minutes": 10,
            }
        ]
    },
    "departure_time": "2026-03-10T18:12:00+09:00",
    "arrival_time": "2026-03-10T18:58:00+09:00",
    "duration_minutes": 46,
}


async def _create_schedule(client, headers):
    resp = await client.post("/api/v1/schedules", headers=headers, json=SCHEDULE_DATA)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
class TestSaveRoute:
    async def test_save_success(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        response = await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers, json=ROUTE_DATA)
        assert response.status_code == 201
        data = response.json()
        assert data["schedule_id"] == schedule_id
        assert data["duration_minutes"] == 46
        assert data["route_data"]["legs"][0]["mode"] == "WALK"

    async def test_save_replaces_existing(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers, json=ROUTE_DATA)
        new_data = {**ROUTE_DATA, "duration_minutes": 30}
        response = await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers, json=new_data)
        assert response.status_code == 201
        assert response.json()["duration_minutes"] == 30

    async def test_save_schedule_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.post("/api/v1/schedules/9999/route", headers=headers, json=ROUTE_DATA)
        assert response.status_code == 404

    async def test_save_other_user(self, client):
        headers1 = await auth_headers(client, email="user1@example.com")
        schedule_id = await _create_schedule(client, headers1)
        headers2 = await auth_headers(client, email="user2@example.com")
        response = await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers2, json=ROUTE_DATA)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetRoute:
    async def test_get_success(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers, json=ROUTE_DATA)
        response = await client.get(f"/api/v1/schedules/{schedule_id}/route", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["schedule_id"] == schedule_id
        assert data["route_data"]["legs"][0]["mode"] == "WALK"

    async def test_get_not_saved(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        response = await client.get(f"/api/v1/schedules/{schedule_id}/route", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeleteRoute:
    async def test_delete_success(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        await client.post(f"/api/v1/schedules/{schedule_id}/route", headers=headers, json=ROUTE_DATA)
        response = await client.delete(f"/api/v1/schedules/{schedule_id}/route", headers=headers)
        assert response.status_code == 204
        # Verify deleted
        get_resp = await client.get(f"/api/v1/schedules/{schedule_id}/route", headers=headers)
        assert get_resp.status_code == 404

    async def test_delete_not_saved(self, client):
        headers = await auth_headers(client)
        schedule_id = await _create_schedule(client, headers)
        response = await client.delete(f"/api/v1/schedules/{schedule_id}/route", headers=headers)
        assert response.status_code == 404
