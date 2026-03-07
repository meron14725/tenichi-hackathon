"""Suggestions API のテスト.

Gemini API と Weather API の呼び出しをモックしたユニットテスト。
"""

import datetime as dt
from unittest.mock import AsyncMock, patch

import pytest

from app.exceptions import AppError


@pytest.mark.asyncio
class TestGeminiService:
    """gemini_service のユニットテスト."""

    async def test_api_key_not_configured(self):
        """APIキー未設定時は AppError(503)."""
        from app.services.gemini_service import generate_today_suggestion

        with patch("app.services.gemini_service.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = ""
            with patch("app.services.gemini_service._configured", False):
                with pytest.raises(AppError) as exc_info:
                    await generate_today_suggestion("予定なし", "晴れ")
                assert exc_info.value.status_code == 503
                assert exc_info.value.code == "SUGGESTIONS_UNAVAILABLE"

    async def test_generate_today_suggestion_success(self):
        """正常系: Gemini API から提案テキストを返す."""
        from app.services.gemini_service import generate_today_suggestion

        mock_response = AsyncMock()
        mock_response.text = "折りたたみ傘を持参してください。"

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                result = await generate_today_suggestion("会議 10:00", "晴れ 20℃")

        assert result == "折りたたみ傘を持参してください。"
        mock_model.generate_content_async.assert_called_once()

    async def test_generate_schedule_suggestion_success(self):
        """正常系: 予定ごとの提案."""
        from app.services.gemini_service import generate_schedule_suggestion

        mock_response = AsyncMock()
        mock_response.text = "近くにおすすめのカフェがあります。"

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                result = await generate_schedule_suggestion("銀座ランチ 12:00")

        assert result == "近くにおすすめのカフェがあります。"

    async def test_generate_today_suggestion_api_failure(self):
        """Gemini API 呼び出し失敗時は AppError(502)."""
        from app.services.gemini_service import generate_today_suggestion

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(side_effect=Exception("API error"))

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                with pytest.raises(AppError) as exc_info:
                    await generate_today_suggestion("予定", "天気")
                assert exc_info.value.status_code == 502
                assert exc_info.value.code == "SUGGESTIONS_UNAVAILABLE"


@pytest.mark.asyncio
class TestSuggestionsService:
    """suggestions_service のユニットテスト."""

    async def test_format_schedules_empty(self):
        """予定がない場合."""
        from app.services.suggestions_service import _format_schedules_for_prompt

        assert _format_schedules_for_prompt([]) == "今日の予定はありません。"

    async def test_format_weather(self):
        """天気情報のフォーマット."""
        from app.services.suggestions_service import _format_weather_for_prompt

        weather = {
            "condition": "Sunny",
            "temp_c": 25.0,
            "chance_of_rain": 10,
            "humidity": 40,
        }
        result = _format_weather_for_prompt(weather)
        assert "Sunny" in result
        assert "25.0" in result
        assert "10%" in result


@pytest.mark.asyncio
class TestSuggestionsSchemas:
    """スキーマのバリデーションテスト."""

    async def test_today_suggestion_response(self):
        from app.schemas.suggestions import TodaySuggestionResponse

        data = {
            "date": "2026-03-10",
            "suggestion": "傘を持っていきましょう。",
            "weather_summary": {
                "temp_c": 12.5,
                "condition": "Partly cloudy",
                "chance_of_rain": 60,
            },
        }
        resp = TodaySuggestionResponse(**data)
        assert resp.date == dt.date(2026, 3, 10)
        assert resp.suggestion == "傘を持っていきましょう。"
        assert resp.weather_summary.temp_c == 12.5

    async def test_today_suggestion_response_no_weather(self):
        data = {
            "date": "2026-03-10",
            "suggestion": "良い一日を。",
            "weather_summary": None,
        }
        resp = TodaySuggestionResponse(**data)
        assert resp.weather_summary is None

    async def test_schedule_suggestion_response(self):
        from app.schemas.suggestions import ScheduleSuggestionResponse

        data = {
            "schedule_id": 42,
            "suggestion": "周辺にカフェがあります。",
        }
        resp = ScheduleSuggestionResponse(**data)
        assert resp.schedule_id == 42
        assert resp.suggestion == "周辺にカフェがあります。"


@pytest.mark.asyncio
class TestSuggestionsAPI:
    """Suggestions API エンドポイントの結合テスト（DB有り、Gemini/Weatherモック）."""

    @patch("app.services.gemini_service._configured", True)
    @patch("app.services.weather_service.get_weather", new_callable=AsyncMock)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_get_today_suggestion(self, mock_model_cls, mock_weather, client):
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        mock_weather.return_value = {
            "temp_c": 12.5,
            "condition": "Partly cloudy",
            "chance_of_rain": 60,
            "humidity": 55,
        }

        mock_response = AsyncMock()
        mock_response.text = "暖かいコートを着てください。"
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_model_cls.return_value = mock_model

        resp = await client.get("/api/v1/suggestions/today", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "suggestion" in data
        assert data["suggestion"] == "暖かいコートを着てください。"
        assert "date" in data
        assert data["weather_summary"]["temp_c"] == 12.5

    @patch("app.services.gemini_service._configured", True)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_get_schedule_suggestion(self, mock_model_cls, client):
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        # まずスケジュールを作成
        schedule_data = {
            "title": "銀座ランチ",
            "start_at": "2026-03-10T12:00:00+09:00",
            "destination_name": "銀座鮨さいとう",
            "destination_address": "東京都中央区銀座",
            "tag_ids": [],
        }
        create_resp = await client.post("/api/v1/schedules", json=schedule_data, headers=headers)
        assert create_resp.status_code == 201
        schedule_id = create_resp.json()["id"]

        mock_response = AsyncMock()
        mock_response.text = "近くにおすすめのバーがあります。"
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_model_cls.return_value = mock_model

        resp = await client.get(f"/api/v1/suggestions/{schedule_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["schedule_id"] == schedule_id
        assert data["suggestion"] == "近くにおすすめのバーがあります。"

    @patch("app.services.gemini_service._configured", True)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_get_schedule_suggestion_not_found(self, mock_model_cls, client):
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        resp = await client.get("/api/v1/suggestions/99999", headers=headers)
        assert resp.status_code == 404

    async def test_suggestions_requires_auth(self, client):
        """認証なしは401."""
        resp = await client.get("/api/v1/suggestions/today")
        assert resp.status_code == 403  # HTTPBearer returns 403 without token
