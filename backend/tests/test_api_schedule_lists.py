"""schedule-lists API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers

SL_DATA = {
    "name": "出社の日",
    "date": "2026-03-10",
    "packing_items": [
        {"name": "折りたたみ傘", "sort_order": 1},
        {"name": "名刺", "sort_order": 2},
    ],
}


async def _create_list(client, headers, data=None):
    return await client.post("/api/v1/schedule-lists", headers=headers, json=data or SL_DATA)


@pytest.mark.asyncio
class TestCreateScheduleList:
    async def test_create_success(self, client):
        headers = await auth_headers(client)
        response = await _create_list(client, headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "出社の日"
        assert data["date"] == "2026-03-10"
        assert len(data["packing_items"]) == 2
        assert data["packing_items"][0]["name"] == "折りたたみ傘"

    async def test_create_without_token(self, client):
        response = await client.post("/api/v1/schedule-lists", json=SL_DATA)
        assert response.status_code == 403


@pytest.mark.asyncio
class TestListScheduleLists:
    async def test_list_with_date_filter(self, client):
        headers = await auth_headers(client)
        await _create_list(client, headers)
        response = await client.get("/api/v1/schedule-lists?start_date=2026-03-10&end_date=2026-03-10", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


@pytest.mark.asyncio
class TestGetScheduleList:
    async def test_get_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        response = await client.get(f"/api/v1/schedule-lists/{list_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "出社の日"

    async def test_get_not_found(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/schedule-lists/999", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
class TestUpdateScheduleList:
    async def test_update_name(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        response = await client.put(f"/api/v1/schedule-lists/{list_id}", headers=headers, json={"name": "在宅の日"})
        assert response.status_code == 200
        assert response.json()["name"] == "在宅の日"


@pytest.mark.asyncio
class TestDeleteScheduleList:
    async def test_delete_success(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        response = await client.delete(f"/api/v1/schedule-lists/{list_id}", headers=headers)
        assert response.status_code == 204


@pytest.mark.asyncio
class TestPackingItems:
    async def test_create_packing_item(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        response = await client.post(
            f"/api/v1/schedule-lists/{list_id}/packing-items",
            headers=headers,
            json={"name": "手土産", "sort_order": 3},
        )
        assert response.status_code == 201
        assert response.json()["name"] == "手土産"

    async def test_update_packing_item(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        item_id = create_resp.json()["packing_items"][0]["id"]
        response = await client.put(
            f"/api/v1/schedule-lists/{list_id}/packing-items/{item_id}",
            headers=headers,
            json={"is_checked": True},
        )
        assert response.status_code == 200
        assert response.json()["is_checked"] is True

    async def test_delete_packing_item(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        item_id = create_resp.json()["packing_items"][0]["id"]
        response = await client.delete(f"/api/v1/schedule-lists/{list_id}/packing-items/{item_id}", headers=headers)
        assert response.status_code == 204

    async def test_packing_item_not_found(self, client):
        headers = await auth_headers(client)
        create_resp = await _create_list(client, headers)
        list_id = create_resp.json()["id"]
        response = await client.put(
            f"/api/v1/schedule-lists/{list_id}/packing-items/999",
            headers=headers,
            json={"name": "x"},
        )
        assert response.status_code == 404
