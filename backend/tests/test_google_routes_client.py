"""Google Routes API v2 クライアントのテスト."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.google_routes_client import _parse_duration, _parse_response, search_routes_google


@pytest.fixture(autouse=True)
async def setup_db():
    """DB 接続不要なテストのため conftest の setup_db を上書き."""
    yield


class TestParseDuration:
    def test_normal(self):
        assert _parse_duration("845s") == 845

    def test_zero(self):
        assert _parse_duration("0s") == 0

    def test_float(self):
        assert _parse_duration("123.4s") == 123

    def test_invalid(self):
        assert _parse_duration("invalid") == 0

    def test_empty(self):
        assert _parse_duration("") == 0


class TestParseResponse:
    def test_single_route(self):
        data = {
            "routes": [
                {
                    "duration": "600s",
                    "legs": [
                        {
                            "duration": "600s",
                            "startLocation": {"latLng": {"latitude": 35.64, "longitude": 139.67}},
                            "endLocation": {"latLng": {"latitude": 35.65, "longitude": 139.70}},
                        }
                    ],
                }
            ]
        }
        result = _parse_response(data, "driving")
        assert len(result) == 1
        assert result[0]["duration_minutes"] == 10
        assert result[0]["legs"][0]["mode"] == "CAR"
        assert result[0]["legs"][0]["duration_minutes"] == 10

    def test_walking_mode(self):
        data = {
            "routes": [
                {
                    "duration": "900s",
                    "legs": [{"duration": "900s"}],
                }
            ]
        }
        result = _parse_response(data, "walking")
        assert result[0]["legs"][0]["mode"] == "WALK"
        assert result[0]["duration_minutes"] == 15

    def test_minimum_duration(self):
        data = {
            "routes": [
                {
                    "duration": "20s",
                    "legs": [{"duration": "20s"}],
                }
            ]
        }
        result = _parse_response(data, "driving")
        assert result[0]["duration_minutes"] == 1

    def test_no_routes(self):
        from app.exceptions import AppError

        with pytest.raises(AppError):
            _parse_response({"routes": []}, "driving")

    def test_empty_response(self):
        from app.exceptions import AppError

        with pytest.raises(AppError):
            _parse_response({}, "driving")


@pytest.mark.asyncio
class TestSearchRoutesGoogle:
    @patch("app.services.google_routes_client._get_access_token", return_value="fake-token")
    @patch("app.services.google_routes_client.settings")
    @patch("app.services.google_routes_client.httpx.AsyncClient")
    async def test_success(self, mock_client_cls, mock_settings, mock_token):
        mock_settings.GCP_PROJECT_ID = "test-project"

        response_data = {
            "routes": [
                {
                    "duration": "600s",
                    "legs": [{"duration": "600s"}],
                }
            ]
        }

        mock_response = AsyncMock()
        mock_response.status_code = 200
        # json() is a sync method on httpx.Response, not async
        mock_response.json = lambda: response_data

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await search_routes_google(35.64, 139.67, 35.65, 139.70, "driving")
        assert len(result) == 1
        assert result[0]["duration_minutes"] == 10

    @patch("app.services.google_routes_client._get_access_token", side_effect=Exception("No credentials"))
    async def test_adc_auth_failure(self, mock_token):
        """ADC認証失敗時はエラー."""
        from app.exceptions import AppError

        with pytest.raises(AppError, match="GOOGLE_ROUTES_ERROR"):
            await search_routes_google(35.64, 139.67, 35.65, 139.70, "driving")

    async def test_invalid_mode(self):
        from app.exceptions import AppError

        with pytest.raises(AppError, match="Unsupported"):
            await search_routes_google(35.64, 139.67, 35.65, 139.70, "transit")
