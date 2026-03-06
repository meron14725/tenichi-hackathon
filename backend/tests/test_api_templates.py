"""templates API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers

TEMPLATE_DATA = {
    "name": "仕事の日ルーティン",
    "category_id": 1,
    "schedules": [
        {
            "title": "朝の準備",
            "start_time": "07:30:00",
            "end_time": "08:30:00",
            "memo": "スーツ着用",
            "tag_ids": [1],
            "sort_order": 1,
        },
        {
            "title": "オフィス出勤",
            "start_time": "09:00:00",
            "end_time": "18:00:00",
            "destination_name": "本社オフィス",
            "travel_mode": "transit",
            "sort_order": 2,
        },
    ],
}


async def _create_template(client, headers, data=None):
    return await client.post("/api/v1/templates", headers=headers, json=data or TEMPLATE_DATA)


@pytest.mark.asyncio
class TestCreateTemplate:
    async def test_create_success(self, client):
        headers = await auth_headers(client)
        response = await _create_template(client, headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "仕事の日ルーティン"
        assert data["category"]["name"] == "仕事の日"
        assert len(data["schedules"]) == 2
        assert data["schedules"][0]["title"] == "朝の準備"
        assert len(data["schedules"][0]["tags"]) == 1

    async def test_create_without_token(self, client):
        response = await client.post("/api/v1/templates", json=TEMPLATE_DATA)
        assert response.status_code == 403


@pytest.mark.asyncio
class TestListTemplates:
    async def test_list_empty(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/templates", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_with_data(self, client):
        headers = await auth_headers(client)
        await _create_template(client, headers)
        response = await client.get("/api/v1/templates", headers=headers)
        assert len(response.json()) == 1


@pytest.mark.asyncio
class TestGetTemplate:
    async def test_get_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_template(client, headers)
        template_id = create_resp.json()["id"]
        response = await client.get(f"/api/v1/templates/{template_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "仕事の日ルーティン"

    async def test_get_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/templates/999", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestUpdateTemplate:
    async def test_update_name(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_template(client, headers)
        template_id = create_resp.json()["id"]
        response = await client.put(
            f"/api/v1/templates/{template_id}", headers=headers, json={"name": "更新ルーティン"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "更新ルーティン"
        # Schedules should remain
        assert len(response.json()["schedules"]) == 2

    async def test_update_replace_schedules(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_template(client, headers)
        template_id = create_resp.json()["id"]
        response = await client.put(
            f"/api/v1/templates/{template_id}",
            headers=headers,
            json={"schedules": [{"title": "新しい予定", "start_time": "10:00:00", "sort_order": 1}]},
        )
        assert response.status_code == 200
        assert len(response.json()["schedules"]) == 1
        assert response.json()["schedules"][0]["title"] == "新しい予定"


@pytest.mark.asyncio
class TestDeleteTemplate:
    async def test_delete_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_template(client, headers)
        template_id = create_resp.json()["id"]
        response = await client.delete(f"/api/v1/templates/{template_id}", headers=headers)
        assert response.status_code == 204

    async def test_delete_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.delete("/api/v1/templates/999", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestApplyTemplate:
    async def test_apply_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_template(client, headers)
        template_id = create_resp.json()["id"]
        response = await client.post(
            f"/api/v1/templates/{template_id}/apply",
            headers=headers,
            json={"date": "2026-03-10"},
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "朝の準備"
        assert data[0]["start_at"] is not None
        assert len(data[0]["tags"]) == 1
        assert data[1]["title"] == "オフィス出勤"

    async def test_apply_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.post("/api/v1/templates/999/apply", headers=headers, json={"date": "2026-03-10"})
        assert response.status_code == 404
