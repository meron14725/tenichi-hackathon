"""天気バッチ処理・都道府県ユーティリティ・サジェスションキャッシュのテスト."""

import datetime as dt
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.prefecture import (
    PREFECTURES,
    calc_weather_severity,
    find_nearest_prefecture,
)


class TestPrefecture:
    """都道府県ユーティリティのテスト."""

    def test_prefectures_count(self):
        assert len(PREFECTURES) == 47

    def test_find_nearest_tokyo(self):
        """東京駅付近 → 東京都."""
        code = find_nearest_prefecture(35.6812, 139.7671)
        assert code == "13"

    def test_find_nearest_osaka(self):
        """大阪駅付近 → 大阪府."""
        code = find_nearest_prefecture(34.7025, 135.4959)
        assert code == "27"

    def test_find_nearest_sapporo(self):
        """札幌駅付近 → 北海道."""
        code = find_nearest_prefecture(43.0687, 141.3508)
        assert code == "01"

    def test_find_nearest_naha(self):
        """那覇空港付近 → 沖縄県."""
        code = find_nearest_prefecture(26.2069, 127.6461)
        assert code == "47"


class TestCalcWeatherSeverity:
    """天気の悪さスコア計算のテスト."""

    def test_clear_day(self):
        """晴天 → 低スコア."""
        score = calc_weather_severity(
            chance_of_rain=0, precip_mm=0.0, wind_kph=5.0, condition="Sunny"
        )
        assert score <= 10

    def test_rainy_day(self):
        """雨天 → 高スコア."""
        score = calc_weather_severity(
            chance_of_rain=80, precip_mm=10.0, wind_kph=20.0, condition="Heavy rain"
        )
        assert score >= 50

    def test_snowy_day(self):
        """雪 → 高スコア."""
        score = calc_weather_severity(
            chance_of_rain=90, precip_mm=15.0, wind_kph=30.0, condition="Snow"
        )
        assert score >= 60

    def test_max_score_capped(self):
        """スコア上限100."""
        score = calc_weather_severity(
            chance_of_rain=100, precip_mm=50.0, wind_kph=100.0, condition="Blizzard"
        )
        assert score == 100

    def test_mild_rain(self):
        """小雨 → 中程度スコア."""
        score = calc_weather_severity(
            chance_of_rain=40, precip_mm=2.0, wind_kph=10.0, condition="Light drizzle"
        )
        assert 10 <= score <= 40


@pytest.mark.asyncio
class TestBatchAuth:
    """バッチ認証依存関数のテスト."""

    async def test_valid_secret(self, client):
        """正しいシークレットでアクセスできる."""
        with patch("app.dependencies.batch_auth.settings") as mock_settings:
            mock_settings.BATCH_SECRET = "test-secret"
            with patch(
                "app.services.weather_batch_service.fetch_all_prefectures_weather",
                new_callable=AsyncMock,
                return_value={"success": 47, "failed": 0, "date": "2026-03-25"},
            ):
                resp = await client.post(
                    "/api/internal/batch/weather",
                    headers={"X-Batch-Secret": "test-secret"},
                )
                assert resp.status_code == 200

    async def test_invalid_secret(self, client):
        """不正なシークレットは401."""
        with patch("app.dependencies.batch_auth.settings") as mock_settings:
            mock_settings.BATCH_SECRET = "test-secret"
            resp = await client.post(
                "/api/internal/batch/weather",
                headers={"X-Batch-Secret": "wrong-secret"},
            )
            assert resp.status_code == 401

    async def test_missing_secret_header(self, client):
        """ヘッダーなしは422."""
        resp = await client.post("/api/internal/batch/weather")
        assert resp.status_code == 422

    async def test_unconfigured_secret(self, client):
        """サーバー側シークレット未設定は503."""
        with patch("app.dependencies.batch_auth.settings") as mock_settings:
            mock_settings.BATCH_SECRET = ""
            resp = await client.post(
                "/api/internal/batch/weather",
                headers={"X-Batch-Secret": "any"},
            )
            assert resp.status_code == 503


@pytest.mark.asyncio
class TestGeminiWeatherSuggestion:
    """generate_weather_suggestion のテスト."""

    async def test_generate_weather_suggestion_success(self):
        from app.services.gemini_service import generate_weather_suggestion

        mock_response = MagicMock()
        mock_response.text = "折りたたみ傘と防寒着をお持ちください。"
        mock_response.candidates = [MagicMock()]

        mock_generate = AsyncMock(return_value=mock_response)
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = mock_generate

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            result = await generate_weather_suggestion(
                prefecture_name="東京都",
                condition="Rain",
                temp_c=10.5,
                chance_of_rain=80,
                humidity=75,
                wind_kph=15.0,
                precip_mm=5.0,
            )

        assert result == "折りたたみ傘と防寒着をお持ちください。"
        mock_generate.assert_called_once()


@pytest.mark.asyncio
class TestSuggestionsCacheIntegration:
    """キャッシュ利用のsuggestions/todayエンドポイントの結合テスト."""

    async def test_today_suggestion_uses_cache(self, client):
        """キャッシュがある場合はキャッシュから返す."""
        from tests.conftest import register_user

        result = await register_user(client, "cache_test@example.com")
        user_id = result["user"]["id"]
        headers = {"Authorization": f"Bearer {result['access_token']}"}

        from app.database import get_db
        from app.main import app
        from app.models.suggestion_cache import SuggestionCache

        today = dt.datetime.now(dt.timezone.utc).date()

        async for db in app.dependency_overrides[get_db]():
            db.add(SuggestionCache(
                user_id=user_id,
                target_date=today,
                suggestion_text="折りたたみ傘をお持ちください。",
                weather_summary_json={
                    "temp_c": 15.0,
                    "condition": "Cloudy",
                    "chance_of_rain": 60,
                },
            ))
            await db.commit()

        resp = await client.get("/api/v1/suggestions/today", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["suggestion"] == "折りたたみ傘をお持ちください。"
        assert data["weather_summary"]["temp_c"] == 15.0
        assert data["weather_summary"]["condition"] == "Cloudy"

    @patch("app.services.weather_service.get_weather", new_callable=AsyncMock)
    async def test_today_suggestion_fallback_when_no_cache(self, mock_weather, client):
        """キャッシュがない場合はリアルタイム生成にフォールバック."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client, "fallback_test@example.com")

        mock_weather.return_value = {
            "temp_c": 20.0,
            "condition": "Sunny",
            "chance_of_rain": 10,
            "humidity": 40,
        }

        mock_response = MagicMock()
        mock_response.text = "日焼け止めを忘れずに。"
        mock_response.candidates = [MagicMock()]

        mock_generate = AsyncMock(return_value=mock_response)
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = mock_generate

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            resp = await client.get("/api/v1/suggestions/today", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["suggestion"] == "日焼け止めを忘れずに。"
