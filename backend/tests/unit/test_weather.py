"""Weather API のテスト.

外部API呼び出しをモックし、DB不要のユニットテストとして実行可能。
DB付き環境では conftest.py の client fixture を利用した結合テストも動作する。
"""

import datetime as dt
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.exceptions import AppError

# --- DB不要のサービス層ユニットテスト ---

MOCK_WEATHERAPI_RESPONSE = {
    "location": {
        "name": "Shibuya",
        "region": "Tokyo",
        "country": "Japan",
        "lat": 35.658,
        "lon": 139.701,
    },
    "forecast": {
        "forecastday": [
            {
                "date": "2026-03-10",
                "day": {
                    "avgtemp_c": 12.5,
                    "maxtemp_c": 15.0,
                    "mintemp_c": 9.0,
                    "condition": {
                        "text": "Partly cloudy",
                        "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
                    },
                    "totalprecip_mm": 0.0,
                    "daily_chance_of_rain": 10,
                    "avghumidity": 55,
                    "maxwind_kph": 8.3,
                },
            },
            {
                "date": "2026-03-11",
                "day": {
                    "avgtemp_c": 9.8,
                    "maxtemp_c": 12.1,
                    "mintemp_c": 6.3,
                    "condition": {
                        "text": "Overcast",
                        "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    },
                    "totalprecip_mm": 1.2,
                    "daily_chance_of_rain": 40,
                    "avghumidity": 65,
                    "maxwind_kph": 12.0,
                },
            },
            {
                "date": "2026-03-12",
                "day": {
                    "avgtemp_c": 8.5,
                    "maxtemp_c": 10.2,
                    "mintemp_c": 5.9,
                    "condition": {
                        "text": "Light rain",
                        "icon": "//cdn.weatherapi.com/weather/64x64/day/296.png",
                    },
                    "totalprecip_mm": 5.5,
                    "daily_chance_of_rain": 75,
                    "avghumidity": 80,
                    "maxwind_kph": 15.0,
                },
            },
        ],
    },
}


@pytest.mark.asyncio
class TestWeatherService:
    """weather_service のユニットテスト."""

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_weather_success(self, mock_fetch):
        from app.services.weather_service import get_weather

        mock_fetch.return_value = MOCK_WEATHERAPI_RESPONSE

        result = await get_weather(35.658, 139.701, dt.date(2026, 3, 10))

        mock_fetch.assert_called_once_with("35.658,139.701", days=3, target_date="2026-03-10")
        assert result["date"] == "2026-03-10"
        assert result["location"]["name"] == "Shibuya"
        assert result["location"]["lat"] == 35.658
        assert result["location"]["lon"] == 139.701
        assert result["temp_c"] == 12.5
        assert result["condition"] == "Partly cloudy"
        assert result["condition_icon_url"] == "//cdn.weatherapi.com/weather/64x64/day/116.png"
        assert result["precip_mm"] == 0.0
        assert result["chance_of_rain"] == 10
        assert result["humidity"] == 55
        assert result["wind_kph"] == 8.3

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_weather_default_date(self, mock_fetch):
        """date 省略時は今日の日付（JST）を使用."""
        from zoneinfo import ZoneInfo

        from app.services.weather_service import get_weather

        today_jst = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date().isoformat()
        response_data = {
            **MOCK_WEATHERAPI_RESPONSE,
            "forecast": {
                "forecastday": [
                    {
                        **MOCK_WEATHERAPI_RESPONSE["forecast"]["forecastday"][0],
                        "date": today_jst,
                    }
                ]
            },
        }
        mock_fetch.return_value = response_data

        result = await get_weather(35.658, 139.701)

        assert result["date"] == today_jst
        mock_fetch.assert_called_once_with("35.658,139.701", days=3, target_date=today_jst)

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_weather_date_out_of_range(self, mock_fetch):
        """リクエスト日付がforecastに含まれない場合は AppError."""
        from app.services.weather_service import get_weather

        mock_fetch.return_value = MOCK_WEATHERAPI_RESPONSE

        with pytest.raises(AppError) as exc_info:
            await get_weather(35.658, 139.701, dt.date(2099, 1, 1))
        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "VALIDATION_ERROR"

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_forecast_success(self, mock_fetch):
        from app.services.weather_service import get_forecast

        mock_fetch.return_value = MOCK_WEATHERAPI_RESPONSE

        result = await get_forecast(35.658, 139.701)

        mock_fetch.assert_called_once_with("35.658,139.701", days=3)
        assert result["location"]["name"] == "Shibuya"
        assert len(result["forecast"]) == 3
        day0 = result["forecast"][0]
        assert day0["date"] == "2026-03-10"
        assert day0["avg_temp_c"] == 12.5
        assert day0["max_temp_c"] == 15.0
        assert day0["min_temp_c"] == 9.0
        assert day0["condition"] == "Partly cloudy"
        assert day0["chance_of_rain"] == 10

        day2 = result["forecast"][2]
        assert day2["condition"] == "Light rain"
        assert day2["chance_of_rain"] == 75

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_weather_external_api_failure(self, mock_fetch):
        """外部API失敗時は AppError(502)."""
        from app.services.weather_service import get_weather

        mock_fetch.side_effect = AppError("WEATHER_UNAVAILABLE", "Weather API request failed", 502)

        with pytest.raises(AppError) as exc_info:
            await get_weather(35.658, 139.701)
        assert exc_info.value.status_code == 502

    @patch("app.services.weather_service.fetch_forecast_raw", new_callable=AsyncMock)
    async def test_get_forecast_external_api_failure(self, mock_fetch):
        """外部API失敗時は AppError(502)."""
        from app.services.weather_service import get_forecast

        mock_fetch.side_effect = AppError("WEATHER_UNAVAILABLE", "Weather API request failed", 502)

        with pytest.raises(AppError) as exc_info:
            await get_forecast(35.658, 139.701)
        assert exc_info.value.status_code == 502


@pytest.mark.asyncio
class TestFetchForecast:
    """fetch_forecast_raw のユニットテスト（httpx をモック）."""

    async def test_api_key_not_configured(self):
        """APIキー未設定時は AppError(503)."""
        from app.services.weather_service import fetch_forecast_raw

        with patch("app.services.weather_service.settings") as mock_settings:
            mock_settings.WEATHERAPI_KEY = ""
            with pytest.raises(AppError) as exc_info:
                await fetch_forecast_raw("35.658,139.701")
            assert exc_info.value.status_code == 503
            assert exc_info.value.code == "WEATHER_UNAVAILABLE"

    async def test_http_error(self):
        """httpx接続エラー時は AppError(502)."""
        import httpx

        from app.services.weather_service import fetch_forecast_raw

        with patch("app.services.weather_service.settings") as mock_settings:
            mock_settings.WEATHERAPI_KEY = "test-key"
            with patch("app.services.weather_service.httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.get.side_effect = httpx.ConnectError("Connection refused")
                mock_client_cls.return_value = mock_client

                with pytest.raises(AppError) as exc_info:
                    await fetch_forecast_raw("35.658,139.701")
                assert exc_info.value.status_code == 502
                assert exc_info.value.code == "WEATHER_UNAVAILABLE"

    async def test_non_200_response(self):
        """外部APIが非200を返す場合は AppError(502)."""
        from app.services.weather_service import fetch_forecast_raw

        with patch("app.services.weather_service.settings") as mock_settings:
            mock_settings.WEATHERAPI_KEY = "test-key"
            with patch("app.services.weather_service.httpx.AsyncClient") as mock_client_cls:
                mock_resp = MagicMock()
                mock_resp.status_code = 401
                mock_resp.text = '{"error": {"message": "Invalid key"}}'

                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.get.return_value = mock_resp
                mock_client_cls.return_value = mock_client

                with pytest.raises(AppError) as exc_info:
                    await fetch_forecast_raw("35.658,139.701")
                assert exc_info.value.status_code == 502

    async def test_success(self):
        """正常系: 200レスポンスを返す."""
        from app.services.weather_service import fetch_forecast_raw

        with patch("app.services.weather_service.settings") as mock_settings:
            mock_settings.WEATHERAPI_KEY = "test-key"
            with patch("app.services.weather_service.httpx.AsyncClient") as mock_client_cls:
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_resp.json.return_value = MOCK_WEATHERAPI_RESPONSE

                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.get.return_value = mock_resp
                mock_client_cls.return_value = mock_client

                result = await fetch_forecast_raw("35.658,139.701", days=3)
                assert result == MOCK_WEATHERAPI_RESPONSE


@pytest.mark.asyncio
class TestWeatherSchemas:
    """スキーマのバリデーションテスト."""

    async def test_weather_response_schema(self):
        from app.schemas.weather import WeatherResponse

        data = {
            "date": "2026-03-10",
            "location": {"name": "Shibuya", "lat": 35.658, "lon": 139.701},
            "temp_c": 12.5,
            "condition": "Partly cloudy",
            "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/116.png",
            "precip_mm": 0.0,
            "chance_of_rain": 10,
            "humidity": 55,
            "wind_kph": 8.3,
        }
        resp = WeatherResponse(**data)
        assert resp.date == dt.date(2026, 3, 10)
        assert resp.location.name == "Shibuya"
        assert resp.temp_c == 12.5

    async def test_forecast_response_schema(self):
        from app.schemas.weather import ForecastResponse

        data = {
            "location": {"name": "Shibuya", "lat": 35.658, "lon": 139.701},
            "forecast": [
                {
                    "date": "2026-03-10",
                    "avg_temp_c": 12.5,
                    "max_temp_c": 15.0,
                    "min_temp_c": 9.0,
                    "condition": "Sunny",
                    "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/113.png",
                    "chance_of_rain": 5,
                }
            ],
        }
        resp = ForecastResponse(**data)
        assert len(resp.forecast) == 1
        assert resp.forecast[0].avg_temp_c == 12.5
        assert resp.forecast[0].date == dt.date(2026, 3, 10)
