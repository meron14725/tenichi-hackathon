"""Suggestions API のテスト.

Gemini API と Weather API の呼び出しをモックしたユニットテスト。
"""

import datetime as dt
from unittest.mock import AsyncMock, MagicMock, patch

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
        mock_response.candidates = [MagicMock()]

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
        mock_response.candidates = [MagicMock()]

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

    async def test_generate_schedule_suggestion_api_failure(self):
        """generate_schedule_suggestion のGemini API失敗時も AppError(502)."""
        from app.services.gemini_service import generate_schedule_suggestion

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(side_effect=Exception("API error"))

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                with pytest.raises(AppError) as exc_info:
                    await generate_schedule_suggestion("予定")
                assert exc_info.value.status_code == 502

    async def test_empty_response_raises_error(self):
        """Gemini APIが空レスポンスを返した場合は AppError(502)."""
        from app.services.gemini_service import generate_today_suggestion

        mock_response = AsyncMock()
        mock_response.text = ""
        mock_response.candidates = [MagicMock()]

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                with pytest.raises(AppError) as exc_info:
                    await generate_today_suggestion("予定", "天気")
                assert exc_info.value.status_code == 502

    async def test_blocked_response_raises_error(self):
        """安全性フィルタでブロックされた場合は AppError(502)."""
        from app.services.gemini_service import generate_today_suggestion

        mock_response = AsyncMock()
        mock_response.candidates = []

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                with pytest.raises(AppError) as exc_info:
                    await generate_today_suggestion("予定", "天気")
                assert exc_info.value.status_code == 502

    async def test_input_truncation(self):
        """入力が長すぎる場合はMAX_INPUT_LENGTHで切り詰められる."""
        from app.services.gemini_service import MAX_INPUT_LENGTH, generate_today_suggestion

        mock_response = AsyncMock()
        mock_response.text = "提案です。"
        mock_response.candidates = [MagicMock()]

        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)

        long_text = "あ" * (MAX_INPUT_LENGTH + 1000)

        with patch("app.services.gemini_service._configured", True):
            with patch("app.services.gemini_service.genai.GenerativeModel", return_value=mock_model):
                result = await generate_today_suggestion(long_text, long_text)

        assert result == "提案です。"
        call_args = mock_model.generate_content_async.call_args[0][0]
        # プロンプトに含まれるテキストがMAX_INPUT_LENGTHで切り詰められている
        assert "あ" * (MAX_INPUT_LENGTH + 1) not in call_args


@pytest.mark.asyncio
class TestSuggestionsService:
    """suggestions_service のユニットテスト."""

    async def test_format_schedules_empty(self):
        """予定がない場合."""
        from app.services.suggestions_service import _format_schedules_for_prompt

        assert _format_schedules_for_prompt([]) == "今日の予定はありません。"

    async def test_format_schedules_with_data(self):
        """複数の予定がある場合のフォーマット."""
        from app.services.suggestions_service import _format_schedules_for_prompt

        schedule1 = MagicMock()
        schedule1.title = "朝会"
        schedule1.start_at = dt.datetime(2026, 3, 10, 9, 0)
        schedule1.end_at = dt.datetime(2026, 3, 10, 10, 0)
        schedule1.destination_name = "会議室A"
        schedule1.tags = []
        schedule1.memo = None

        schedule2 = MagicMock()
        schedule2.title = "ランチ"
        schedule2.start_at = dt.datetime(2026, 3, 10, 12, 0)
        schedule2.end_at = None
        schedule2.destination_name = "銀座"
        tag = MagicMock()
        tag.name = "会食"
        schedule2.tags = [tag]
        schedule2.memo = "手土産持参"

        result = _format_schedules_for_prompt([schedule1, schedule2])
        assert "朝会" in result
        assert "ランチ" in result
        assert "09:00" in result
        assert "会食" in result
        assert "手土産持参" in result

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
        assert "40%" in result

    async def test_format_schedule_for_prompt(self):
        """予定情報のフォーマット."""
        from app.services.suggestions_service import _format_schedule_for_prompt

        schedule = MagicMock()
        schedule.title = "銀座ディナー"
        schedule.start_at = dt.datetime(2026, 3, 10, 19, 0, tzinfo=dt.timezone.utc)
        schedule.end_at = dt.datetime(2026, 3, 10, 21, 0, tzinfo=dt.timezone.utc)
        schedule.destination_name = "銀座鮨さいとう"
        schedule.destination_address = "東京都中央区銀座"
        tag = MagicMock()
        tag.name = "会食"
        schedule.tags = [tag]
        schedule.memo = "手土産必要"

        result = _format_schedule_for_prompt(schedule)
        assert "銀座ディナー" in result
        assert "銀座鮨さいとう" in result
        assert "東京都中央区銀座" in result
        assert "会食" in result
        assert "手土産必要" in result

    async def test_format_schedule_for_prompt_minimal(self):
        """最小限の予定情報のフォーマット."""
        from app.services.suggestions_service import _format_schedule_for_prompt

        schedule = MagicMock()
        schedule.title = "打ち合わせ"
        schedule.start_at = dt.datetime(2026, 3, 10, 10, 0, tzinfo=dt.timezone.utc)
        schedule.end_at = None
        schedule.destination_name = None
        schedule.destination_address = None
        schedule.tags = []
        schedule.memo = None

        result = _format_schedule_for_prompt(schedule)
        assert "打ち合わせ" in result
        assert "目的地" not in result
        assert "住所" not in result
        assert "タグ" not in result
        assert "メモ" not in result


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
        from app.schemas.suggestions import TodaySuggestionResponse

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
        mock_response.candidates = [MagicMock()]
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
    @patch("app.services.weather_service.get_weather", new_callable=AsyncMock)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_get_today_suggestion_weather_failure(self, mock_model_cls, mock_weather, client):
        """天気API失敗時もフォールバックして提案を返す."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        mock_weather.side_effect = AppError("WEATHER_UNAVAILABLE", "Weather API failed", 502)

        mock_response = AsyncMock()
        mock_response.text = "良い一日をお過ごしください。"
        mock_response.candidates = [MagicMock()]
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_model_cls.return_value = mock_model

        resp = await client.get("/api/v1/suggestions/today", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["suggestion"] == "良い一日をお過ごしください。"
        assert data["weather_summary"] is None

    @patch("app.services.gemini_service._configured", True)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_get_schedule_suggestion(self, mock_model_cls, client):
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

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
        mock_response.candidates = [MagicMock()]
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

    @patch("app.services.gemini_service._configured", True)
    @patch("app.services.gemini_service.genai.GenerativeModel")
    async def test_other_user_schedule_not_accessible(self, mock_model_cls, client):
        """他ユーザーのスケジュールにはアクセスできない."""
        from tests.conftest import auth_headers

        headers_user1 = await auth_headers(client, "user1@example.com")

        schedule_data = {
            "title": "ユーザー1の予定",
            "start_at": "2026-03-10T12:00:00+09:00",
            "tag_ids": [],
        }
        create_resp = await client.post("/api/v1/schedules", json=schedule_data, headers=headers_user1)
        assert create_resp.status_code == 201
        schedule_id = create_resp.json()["id"]

        headers_user2 = await auth_headers(client, "user2@example.com")
        resp = await client.get(f"/api/v1/suggestions/{schedule_id}", headers=headers_user2)
        assert resp.status_code == 404

    async def test_suggestions_requires_auth(self, client):
        """認証なしは403."""
        resp = await client.get("/api/v1/suggestions/today")
        assert resp.status_code == 403
