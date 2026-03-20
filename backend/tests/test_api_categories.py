"""categories API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestListCategories:
    async def test_list_success(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/categories", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert data[0]["name"] == "休日"
        assert data[1]["name"] == "旅行"
        assert data[2]["name"] == "仕事"
        assert data[3]["name"] == "出張"

    async def test_list_without_token(self, client):
        response = await client.get("/api/v1/categories")
        assert response.status_code == 403
