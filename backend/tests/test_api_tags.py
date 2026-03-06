"""tags API エンドポイントのテスト."""

import pytest

from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestListTags:
    async def test_list_tags_success(self, client):
        headers = await auth_headers(client)
        response = await client.get("/api/v1/tags", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        names = [t["name"] for t in data]
        assert "仕事" in names
        assert "会食" in names
        assert "デート" in names
        assert "運動" in names

    async def test_list_tags_without_token(self, client):
        response = await client.get("/api/v1/tags")
        assert response.status_code == 403
