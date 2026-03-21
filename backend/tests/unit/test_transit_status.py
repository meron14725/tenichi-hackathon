"""Transit Status API のテスト.

Gemini API (Google Search grounding 付き) をモックしたユニットテスト。
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.exceptions import AppError
from app.services.transit_status_service import (
    _build_status_text,
    _extract_lines_from_route_data,
    _format_lines_for_prompt,
)


def _make_route_data(*legs: dict) -> str:
    """テスト用の route_data JSON を生成する."""
    return json.dumps({"itineraries": [{"legs": list(legs)}]})


class TestExtractLinesFromRouteData:
    """_extract_lines_from_route_data のユニットテスト."""

    def test_extract_rail_and_subway(self):
        """RAIL/SUBWAY のleg を抽出する."""
        route_data = _make_route_data(
            {
                "mode": "RAIL",
                "route_short_name": "中央線",
                "route_long_name": "JR中央線快速",
                "agency_name": "JR東日本",
            },
            {
                "mode": "SUBWAY",
                "route_short_name": "丸ノ内線",
                "route_long_name": "東京メトロ丸ノ内線",
                "agency_name": "東京メトロ",
            },
        )
        lines = _extract_lines_from_route_data(route_data)
        assert len(lines) == 2
        assert lines[0]["mode"] == "RAIL"
        assert lines[0]["route_short_name"] == "中央線"
        assert lines[1]["mode"] == "SUBWAY"

    def test_walk_legs_excluded(self):
        """WALK のleg は除外される."""
        route_data = _make_route_data(
            {"mode": "WALK", "from_name": "自宅", "to_name": "駅"},
            {
                "mode": "RAIL",
                "route_short_name": "山手線",
                "route_long_name": "JR山手線",
                "agency_name": "JR東日本",
            },
        )
        lines = _extract_lines_from_route_data(route_data)
        assert len(lines) == 1
        assert lines[0]["mode"] == "RAIL"

    def test_deduplication(self):
        """同じ路線の重複は排除される."""
        leg = {
            "mode": "RAIL",
            "route_short_name": "山手線",
            "route_long_name": "JR山手線",
            "agency_name": "JR東日本",
        }
        route_data = _make_route_data(leg, leg)
        lines = _extract_lines_from_route_data(route_data)
        assert len(lines) == 1

    def test_invalid_json(self):
        """不正な JSON は空リストを返す."""
        assert _extract_lines_from_route_data("not json") == []

    def test_none_input(self):
        """None は空リストを返す."""
        assert _extract_lines_from_route_data(None) == []

    def test_empty_string(self):
        """空文字列は空リストを返す."""
        assert _extract_lines_from_route_data("") == []

    def test_no_itineraries(self):
        """itineraries が空の場合."""
        assert _extract_lines_from_route_data('{"itineraries": []}') == []

    def test_bus_included(self):
        """BUS モードも抽出される."""
        route_data = _make_route_data(
            {
                "mode": "BUS",
                "route_short_name": "都01",
                "route_long_name": "",
                "agency_name": "都営バス",
            },
        )
        lines = _extract_lines_from_route_data(route_data)
        assert len(lines) == 1
        assert lines[0]["mode"] == "BUS"

    def test_empty_string_fields_become_none(self):
        """空文字列フィールドは None に変換される."""
        route_data = _make_route_data(
            {
                "mode": "RAIL",
                "route_short_name": "",
                "route_long_name": "",
                "agency_name": "",
            },
        )
        lines = _extract_lines_from_route_data(route_data)
        assert len(lines) == 1
        assert lines[0]["route_short_name"] is None
        assert lines[0]["route_long_name"] is None
        assert lines[0]["agency_name"] is None


class TestFormatLinesForPrompt:
    """_format_lines_for_prompt のユニットテスト."""

    def test_empty_list(self):
        """空リストはデフォルトメッセージを返す."""
        result = _format_lines_for_prompt([])
        assert result == "利用予定の路線はありません。"

    def test_single_line(self):
        """1路線のフォーマット."""
        lines = [
            {
                "mode": "RAIL",
                "route_short_name": "中央線",
                "route_long_name": "JR中央線快速",
                "agency_name": "JR東日本",
            }
        ]
        result = _format_lines_for_prompt(lines)
        assert "JR中央線快速" in result
        assert "JR東日本" in result
        assert "RAIL" in result

    def test_uses_short_name_when_no_long_name(self):
        """route_long_name がない場合は route_short_name を使う."""
        lines = [
            {
                "mode": "BUS",
                "route_short_name": "都01",
                "route_long_name": None,
                "agency_name": "都営バス",
            }
        ]
        result = _format_lines_for_prompt(lines)
        assert "都01" in result

    def test_unknown_when_no_names(self):
        """両方の名前がない場合は「不明」."""
        lines = [
            {
                "mode": "RAIL",
                "route_short_name": None,
                "route_long_name": None,
                "agency_name": None,
            }
        ]
        result = _format_lines_for_prompt(lines)
        assert "不明" in result


def _make_mock_client(mock_generate_content: AsyncMock) -> MagicMock:
    """google-genai Client のモックを生成する."""
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content
    return mock_client


class TestBuildStatusText:
    """_build_status_text のユニットテスト."""

    def test_null_response(self):
        """null → 遅延なしメッセージ."""
        assert _build_status_text("null") == "予定中の路線に運行の遅延はありません。"

    def test_null_uppercase(self):
        """NULL も遅延なし."""
        assert _build_status_text("NULL") == "予定中の路線に運行の遅延はありません。"

    def test_empty_array(self):
        """空配列 → 遅延なし."""
        assert _build_status_text("[]") == "予定中の路線に運行の遅延はありません。"

    def test_single_delay(self):
        """遅延1件."""
        raw = '[{"line_name": "JR中央線快速", "status": "約10分の遅延"}]'
        result = _build_status_text(raw)
        assert "JR中央線快速" in result
        assert "約10分の遅延" in result

    def test_multiple_delays(self):
        """遅延複数件."""
        raw = json.dumps(
            [
                {"line_name": "JR中央線快速", "status": "約10分の遅延"},
                {"line_name": "東京メトロ丸ノ内線", "status": "運転見合わせ"},
            ]
        )
        result = _build_status_text(raw)
        assert "JR中央線快速" in result
        assert "東京メトロ丸ノ内線" in result
        assert "運転見合わせ" in result

    def test_markdown_code_block_stripped(self):
        """マークダウンコードブロックが除去される."""
        raw = "```json\nnull\n```"
        assert _build_status_text(raw) == "予定中の路線に運行の遅延はありません。"

    def test_markdown_code_block_with_delays(self):
        """マークダウンコードブロック内のJSON配列."""
        raw = '```json\n[{"line_name": "JR山手線", "status": "約5分の遅延"}]\n```'
        result = _build_status_text(raw)
        assert "JR山手線" in result
        assert "約5分の遅延" in result

    def test_invalid_json_fallback(self):
        """パース不能な文字列 → 遅延なしにフォールバック."""
        assert _build_status_text("something unexpected") == "予定中の路線に運行の遅延はありません。"

    def test_empty_string(self):
        """空文字列 → 遅延なし."""
        assert _build_status_text("") == "予定中の路線に運行の遅延はありません。"


@pytest.mark.asyncio
class TestGenerateTransitStatus:
    """gemini_service.generate_transit_status のユニットテスト."""

    async def test_success(self):
        """正常系: Gemini が JSON を返す."""
        from app.services.gemini_service import generate_transit_status

        mock_response = MagicMock()
        mock_response.text = '[{"line_name": "JR中央線快速", "status": "約5分の遅延"}]'
        mock_response.candidates = [MagicMock()]

        mock_generate = AsyncMock(return_value=mock_response)
        mock_client = _make_mock_client(mock_generate)

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            result = await generate_transit_status("- JR中央線快速\n- 東京メトロ丸ノ内線")

        assert "JR中央線快速" in result
        mock_generate.assert_called_once()

        # Google Search grounding の tools が渡されていることを確認
        call_kwargs = mock_generate.call_args.kwargs
        config = call_kwargs["config"]
        assert config.tools is not None
        assert len(config.tools) > 0

    async def test_api_failure(self):
        """Gemini API 呼び出し失敗時は AppError(502)."""
        from app.services.gemini_service import generate_transit_status

        mock_generate = AsyncMock(side_effect=Exception("API error"))
        mock_client = _make_mock_client(mock_generate)

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            with pytest.raises(AppError) as exc_info:
                await generate_transit_status("- JR中央線")
            assert exc_info.value.status_code == 502

    async def test_empty_response(self):
        """空レスポンス時は AppError(502)."""
        from app.services.gemini_service import generate_transit_status

        mock_response = MagicMock()
        mock_response.text = ""
        mock_response.candidates = [MagicMock()]

        mock_generate = AsyncMock(return_value=mock_response)
        mock_client = _make_mock_client(mock_generate)

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            with pytest.raises(AppError) as exc_info:
                await generate_transit_status("- JR中央線")
            assert exc_info.value.status_code == 502


@pytest.mark.asyncio
class TestTransitStatusAPI:
    """Transit Status API エンドポイントの結合テスト（DB有り、Geminiモック）."""

    async def _create_schedule_with_route(self, client, headers, schedule_list_id):
        """テスト用にスケジュールとルートを作成する."""
        schedule_data = {
            "title": "テスト予定",
            "start_at": "2026-03-22T10:00:00+09:00",
            "destination_name": "東京駅",
            "travel_mode": "transit",
            "tag_ids": [],
            "schedule_list_id": schedule_list_id,
        }
        resp = await client.post("/api/v1/schedules", json=schedule_data, headers=headers)
        assert resp.status_code == 201
        schedule_id = resp.json()["id"]

        route_data = {
            "route_data": {
                "itineraries": [
                    {
                        "legs": [
                            {
                                "mode": "WALK",
                                "from_name": "自宅",
                                "to_name": "新宿駅",
                                "departure_time": "2026-03-22T09:00:00+09:00",
                                "arrival_time": "2026-03-22T09:10:00+09:00",
                                "duration_minutes": 10,
                            },
                            {
                                "mode": "RAIL",
                                "from_name": "新宿駅",
                                "to_name": "東京駅",
                                "departure_time": "2026-03-22T09:15:00+09:00",
                                "arrival_time": "2026-03-22T09:45:00+09:00",
                                "duration_minutes": 30,
                                "route_short_name": "中央線",
                                "route_long_name": "JR中央線快速",
                                "agency_name": "JR東日本",
                                "headsign": "東京",
                            },
                        ],
                        "departure_time": "2026-03-22T09:00:00+09:00",
                        "arrival_time": "2026-03-22T09:45:00+09:00",
                        "duration_minutes": 45,
                    }
                ]
            },
            "departure_time": "2026-03-22T09:00:00+09:00",
            "arrival_time": "2026-03-22T09:45:00+09:00",
            "duration_minutes": 45,
        }
        resp = await client.post(
            f"/api/v1/schedules/{schedule_id}/route",
            json=route_data,
            headers=headers,
        )
        assert resp.status_code == 201
        return schedule_id

    async def test_get_transit_status_success(self, client):
        """正常系: 運行状況を取得."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        # スケジュールリスト作成
        list_resp = await client.post(
            "/api/v1/schedule-lists",
            json={"name": "テストリスト", "date": "2026-03-22"},
            headers=headers,
        )
        assert list_resp.status_code == 201
        schedule_list_id = list_resp.json()["id"]

        await self._create_schedule_with_route(client, headers, schedule_list_id)

        # Gemini が null（遅延なし）を返すケース
        mock_response = MagicMock()
        mock_response.text = "null"
        mock_response.candidates = [MagicMock()]
        mock_generate = AsyncMock(return_value=mock_response)
        mock_client = _make_mock_client(mock_generate)

        with patch("app.services.gemini_service._get_client", return_value=mock_client):
            resp = await client.get(
                f"/api/v1/transit-status?schedule_list_id={schedule_list_id}",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["schedule_list_id"] == schedule_list_id
        assert len(data["lines"]) == 1
        assert data["lines"][0]["mode"] == "RAIL"
        assert data["lines"][0]["route_short_name"] == "中央線"
        assert data["status_text"] == "予定中の路線に運行の遅延はありません。"

    async def test_no_schedules_returns_404(self, client):
        """スケジュールがない場合は404."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client)
        resp = await client.get(
            "/api/v1/transit-status?schedule_list_id=99999",
            headers=headers,
        )
        assert resp.status_code == 404

    async def test_no_transit_lines_returns_friendly_message(self, client):
        """交通路線がない場合（徒歩のみ）は空linesとメッセージ."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client)

        list_resp = await client.post(
            "/api/v1/schedule-lists",
            json={"name": "徒歩リスト", "date": "2026-03-22"},
            headers=headers,
        )
        assert list_resp.status_code == 201
        schedule_list_id = list_resp.json()["id"]

        # ルートなしのスケジュールを作成
        schedule_data = {
            "title": "散歩",
            "start_at": "2026-03-22T10:00:00+09:00",
            "travel_mode": "walking",
            "tag_ids": [],
            "schedule_list_id": schedule_list_id,
        }
        resp = await client.post("/api/v1/schedules", json=schedule_data, headers=headers)
        assert resp.status_code == 201

        resp = await client.get(
            f"/api/v1/transit-status?schedule_list_id={schedule_list_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["lines"] == []
        assert "見つかりませんでした" in data["status_text"]

    async def test_requires_auth(self, client):
        """認証なしは403."""
        resp = await client.get("/api/v1/transit-status?schedule_list_id=1")
        assert resp.status_code == 403

    async def test_missing_schedule_list_id_returns_422(self, client):
        """schedule_list_id パラメータなしは422."""
        from tests.conftest import auth_headers

        headers = await auth_headers(client)
        resp = await client.get("/api/v1/transit-status", headers=headers)
        assert resp.status_code == 422

    async def test_other_user_not_accessible(self, client):
        """他ユーザーのスケジュールリストにはアクセスできない."""
        from tests.conftest import auth_headers

        headers_user1 = await auth_headers(client, "user1@example.com")

        list_resp = await client.post(
            "/api/v1/schedule-lists",
            json={"name": "ユーザー1リスト", "date": "2026-03-22"},
            headers=headers_user1,
        )
        assert list_resp.status_code == 201
        schedule_list_id = list_resp.json()["id"]

        await self._create_schedule_with_route(client, headers_user1, schedule_list_id)

        headers_user2 = await auth_headers(client, "user2@example.com")
        resp = await client.get(
            f"/api/v1/transit-status?schedule_list_id={schedule_list_id}",
            headers=headers_user2,
        )
        assert resp.status_code == 404
