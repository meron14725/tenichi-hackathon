"""routes API エンドポイントのテスト."""

from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import auth_headers

MOCK_ITINERARIES = [
    {
        "departure_time": "2026-03-10T18:12:00+09:00",
        "arrival_time": "2026-03-10T18:58:00+09:00",
        "duration_minutes": 46,
        "number_of_transfers": 1,
        "legs": [
            {
                "mode": "WALK",
                "from_name": "出発地",
                "to_name": "高円寺駅",
                "departure_time": "2026-03-10T18:12:00+09:00",
                "arrival_time": "2026-03-10T18:20:00+09:00",
                "duration_minutes": 8,
            },
            {
                "mode": "RAIL",
                "route_short_name": "中央線",
                "agency_name": "JR東日本",
                "headsign": "東京方面",
                "from_name": "高円寺駅",
                "to_name": "新宿駅",
                "departure_time": "2026-03-10T18:23:00+09:00",
                "arrival_time": "2026-03-10T18:29:00+09:00",
                "duration_minutes": 6,
            },
        ],
    }
]

SEARCH_DATA = {
    "origin_lat": 35.6895,
    "origin_lon": 139.6917,
    "destination_lat": 35.6580,
    "destination_lon": 139.7016,
    "travel_mode": "transit",
}


@pytest.mark.asyncio
class TestSearchRoutes:
    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_search_success(self, mock_otp2, client):
        mock_otp2.return_value = MOCK_ITINERARIES
        headers = await auth_headers(client)
        response = await client.post("/api/v1/routes/search", headers=headers, json=SEARCH_DATA)
        assert response.status_code == 200
        data = response.json()
        assert len(data["itineraries"]) == 1
        assert data["itineraries"][0]["duration_minutes"] == 46
        assert len(data["itineraries"][0]["legs"]) == 2

    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_search_home_fallback(self, mock_otp2, client):
        """origin 省略時に UserSettings.home_lat/lon をフォールバック."""
        mock_otp2.return_value = MOCK_ITINERARIES
        headers = await auth_headers(client)
        data = {
            "destination_lat": 35.6580,
            "destination_lon": 139.7016,
            "travel_mode": "transit",
        }
        response = await client.post("/api/v1/routes/search", headers=headers, json=data)
        assert response.status_code == 200
        # OTP2 に home_lat/lon が渡されたことを確認
        call_args = mock_otp2.call_args
        assert call_args.kwargs["origin_lat"] == pytest.approx(35.6584, abs=0.001)
        assert call_args.kwargs["origin_lon"] == pytest.approx(139.7015, abs=0.001)

    async def test_search_without_token(self, client):
        response = await client.post("/api/v1/routes/search", json=SEARCH_DATA)
        assert response.status_code == 403

    async def test_search_invalid_travel_mode(self, client):
        headers = await auth_headers(client)
        data = {**SEARCH_DATA, "travel_mode": "teleport"}
        response = await client.post("/api/v1/routes/search", headers=headers, json=data)
        assert response.status_code == 422

    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_search_otp_unavailable(self, mock_otp2, client):
        from app.exceptions import AppError

        mock_otp2.side_effect = AppError("OTP_UNAVAILABLE", "Route planning service is unavailable", 503)
        headers = await auth_headers(client)
        response = await client.post("/api/v1/routes/search", headers=headers, json=SEARCH_DATA)
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "OTP_UNAVAILABLE"

    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_search_route_not_found(self, mock_otp2, client):
        from app.exceptions import AppError

        mock_otp2.side_effect = AppError("ROUTE_NOT_FOUND", "No routes found", 404)
        headers = await auth_headers(client)
        response = await client.post("/api/v1/routes/search", headers=headers, json=SEARCH_DATA)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "ROUTE_NOT_FOUND"


DEPARTURE_TIME_DATA = {
    "destination_lat": 35.6580,
    "destination_lon": 139.7016,
    "arrival_time": "2026-03-10T19:00:00+09:00",
    "travel_mode": "transit",
}


@pytest.mark.asyncio
class TestDepartureTime:
    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_departure_time_success(self, mock_otp2, client):
        mock_otp2.return_value = MOCK_ITINERARIES
        headers = await auth_headers(client)
        response = await client.post("/api/v1/routes/departure-time", headers=headers, json=DEPARTURE_TIME_DATA)
        assert response.status_code == 200
        data = response.json()
        assert "leave_home_at" in data
        assert "start_preparation_at" in data
        assert data["preparation_minutes"] == 30
        assert len(data["itineraries"]) == 1

    @patch("app.services.otp2_client.search_routes", new_callable=AsyncMock)
    async def test_departure_time_preparation_calculation(self, mock_otp2, client):
        """preparation_minutes が正しく計算されるか確認."""
        mock_otp2.return_value = MOCK_ITINERARIES
        headers = await auth_headers(client)
        response = await client.post("/api/v1/routes/departure-time", headers=headers, json=DEPARTURE_TIME_DATA)
        assert response.status_code == 200
        data = response.json()
        from datetime import datetime, timedelta

        leave = datetime.fromisoformat(data["leave_home_at"])
        start_prep = datetime.fromisoformat(data["start_preparation_at"])
        assert leave - start_prep == timedelta(minutes=30)

    async def test_departure_time_without_token(self, client):
        response = await client.post("/api/v1/routes/departure-time", json=DEPARTURE_TIME_DATA)
        assert response.status_code == 403
