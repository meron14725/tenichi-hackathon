"""OTP2 + API 結合テスト.

実際の OTP2 サーバーに対してリクエストを送信し、
API 全体のエンドツーエンド動作を検証する。
OTP2 未起動時は全テスト自動スキップ。
"""

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers
from tests.integration.conftest import (
    KOENJI,
    ROPPONGI,
    SHIBUYA,
    SHINJUKU,
    TOKYO_STATION,
)

pytestmark = pytest.mark.integration


# ============================================================
# 経路検索 (POST /api/v1/routes/search)
# ============================================================


class TestSearchRoutesIntegration:
    """経路検索エンドポイントの結合テスト."""

    async def test_search_transit(self, client: AsyncClient, future_arrival_time: str):
        """TC-01: transit モードで新宿→東京駅の経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "itineraries" in data
        assert len(data["itineraries"]) >= 1

        # transit モードでは RAIL/SUBWAY/BUS leg が含まれるはず
        transit_modes = {"RAIL", "SUBWAY", "BUS"}
        all_leg_modes = {leg["mode"] for it in data["itineraries"] for leg in it["legs"]}
        assert all_leg_modes & transit_modes, f"transit search should include RAIL/SUBWAY/BUS legs, got {all_leg_modes}"

    async def test_search_walking(self, client: AsyncClient):
        """TC-02: walking モードで新宿→渋谷の徒歩経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": SHIBUYA["lat"],
                "destination_lon": SHIBUYA["lon"],
                "travel_mode": "walking",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) == 1

        it = data["itineraries"][0]
        # OTP2 は長距離の walking リクエストでも transit leg を含む場合がある
        assert any(leg["mode"] == "WALK" for leg in it["legs"]), (
            f"walking mode should include at least one WALK leg, got {[leg['mode'] for leg in it['legs']]}"
        )
        assert it["duration_minutes"] > 0

    async def test_search_cycling(self, client: AsyncClient):
        """TC-03: cycling モードで新宿→六本木の自転車経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": ROPPONGI["lat"],
                "destination_lon": ROPPONGI["lon"],
                "travel_mode": "cycling",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) == 1

        it = data["itineraries"][0]
        for leg in it["legs"]:
            assert leg["mode"] == "BICYCLE", f"cycling mode should only have BICYCLE legs, got {leg['mode']}"

    async def test_search_driving(self, client: AsyncClient):
        """TC-04: driving モードで高円寺→東京駅の車経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": KOENJI["lat"],
                "origin_lon": KOENJI["lon"],
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "driving",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) == 1

        it = data["itineraries"][0]
        for leg in it["legs"]:
            assert leg["mode"] == "CAR", f"driving mode should only have CAR legs, got {leg['mode']}"

    async def test_search_with_arrival_time(self, client: AsyncClient, future_arrival_time: str):
        """TC-05: arrival_time 指定で到着逆算検索が動作する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["itineraries"]) >= 1

    async def test_search_home_fallback(self, client: AsyncClient, future_arrival_time: str):
        """TC-06: origin 省略時にユーザーの home 座標がフォールバック使用される."""
        headers = await auth_headers(client)
        # origin_lat / origin_lon を省略 → UserSettings.home_lat/lon を使用
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200 with home fallback, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) >= 1

    async def test_search_response_structure(self, client: AsyncClient, future_arrival_time: str):
        """TC-07: transit 検索レスポンスの構造が API 仕様に準拠している."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()

        for it in data["itineraries"]:
            # ItineraryResponse 必須フィールド
            assert "departure_time" in it
            assert "arrival_time" in it
            assert "duration_minutes" in it
            assert "legs" in it
            assert isinstance(it["legs"], list)
            assert len(it["legs"]) >= 1
            assert it["duration_minutes"] > 0

            # 出発 < 到着の不変条件
            dep = datetime.fromisoformat(it["departure_time"])
            arr = datetime.fromisoformat(it["arrival_time"])
            assert dep < arr, f"departure {dep} should be before arrival {arr}"

            # transit では number_of_transfers が存在
            assert "number_of_transfers" in it
            assert it["number_of_transfers"] >= 0

            for leg in it["legs"]:
                # LegResponse 必須フィールド
                assert "mode" in leg
                assert "from_name" in leg
                assert "to_name" in leg
                assert "departure_time" in leg
                assert "arrival_time" in leg
                assert "duration_minutes" in leg
                assert leg["duration_minutes"] >= 1

                # leg の出発 < 到着
                leg_dep = datetime.fromisoformat(leg["departure_time"])
                leg_arr = datetime.fromisoformat(leg["arrival_time"])
                assert leg_dep <= leg_arr, f"leg departure {leg_dep} should be <= arrival {leg_arr}"

    async def test_search_transit_multiple_results(self, client: AsyncClient, future_arrival_time: str):
        """TC-08: transit 検索が複数の経路候補を返す (first: 5)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["itineraries"]) >= 2, (
            f"transit search should return multiple itineraries, got {len(data['itineraries'])}"
        )


# ============================================================
# 出発時刻逆算 (POST /api/v1/routes/departure-time)
# ============================================================


class TestDepartureTimeIntegration:
    """出発時刻逆算エンドポイントの結合テスト."""

    async def test_departure_time_transit(self, client: AsyncClient, future_arrival_time: str):
        """TC-09: transit モードの出発時刻逆算が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "transit",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "leave_home_at" in data
        assert "start_preparation_at" in data
        assert data["preparation_minutes"] == 30  # conftest REGISTER_DATA の値
        assert "arrival_time" in data
        assert "itineraries" in data
        assert len(data["itineraries"]) >= 1

    async def test_departure_time_preparation_math(self, client: AsyncClient, future_arrival_time: str):
        """TC-10: leave_home_at - start_preparation_at == preparation_minutes (30分)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "transit",
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()

        leave = datetime.fromisoformat(data["leave_home_at"])
        start_prep = datetime.fromisoformat(data["start_preparation_at"])
        diff = leave - start_prep

        assert diff == timedelta(minutes=30), (
            f"Expected 30 min difference, got {diff} "
            f"(leave_home_at={data['leave_home_at']}, start_preparation_at={data['start_preparation_at']})"
        )

    async def test_departure_time_walking(self, client: AsyncClient, future_arrival_time: str):
        """TC-11: walking モードの出発時刻逆算が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": SHIBUYA["lat"],
                "destination_lon": SHIBUYA["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "walking",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "leave_home_at" in data
        assert len(data["itineraries"]) >= 1

    async def test_departure_time_leave_before_arrival(self, client: AsyncClient, future_arrival_time: str):
        """TC-12: leave_home_at が arrival_time より前であることを検証."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": TOKYO_STATION["lat"],
                "destination_lon": TOKYO_STATION["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "transit",
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()

        leave = datetime.fromisoformat(data["leave_home_at"])
        arrival = datetime.fromisoformat(data["arrival_time"])
        assert leave < arrival, f"leave_home_at ({leave}) should be before arrival_time ({arrival})"


# ============================================================
# エラーケース
# ============================================================


class TestOTP2ErrorCasesIntegration:
    """OTP2 エラーケースの結合テスト."""

    async def test_search_invalid_coordinates(self, client: AsyncClient):
        """TC-13: GTFS 範囲外の座標 (0, 0) で 404 ROUTE_NOT_FOUND が返る."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": 0.0,
                "origin_lon": 0.0,
                "destination_lat": 0.1,
                "destination_lon": 0.1,
                "travel_mode": "walking",
            },
            headers=headers,
        )

        # OTP2 がルートを見つけられない → 404
        assert resp.status_code in (404, 503), (
            f"Expected 404 or 503 for out-of-range coordinates, got {resp.status_code}: {resp.text}"
        )

    async def test_search_same_origin_destination(self, client: AsyncClient):
        """TC-14: 出発地と目的地が同一座標の場合の動作確認."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINJUKU["lat"],
                "origin_lon": SHINJUKU["lon"],
                "destination_lat": SHINJUKU["lat"],
                "destination_lon": SHINJUKU["lon"],
                "travel_mode": "walking",
            },
            headers=headers,
        )

        # 同一地点: OTP2 は 200 で 0 分の経路を返すか、404 を返す可能性がある
        assert resp.status_code in (200, 404), (
            f"Expected 200 or 404 for same origin/destination, got {resp.status_code}: {resp.text}"
        )
