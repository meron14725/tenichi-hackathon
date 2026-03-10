"""OTP2 + API 結合テスト (v2 — 異なる座標値でのバリエーション).

既存 test_otp2_routes.py (TC-01〜TC-14) と同じアサーションロジックで、
異なるルート（池袋・品川・上野・秋葉原・目黒）を使用して
OTP2 統合の信頼性を幅広く検証する。
"""

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers
from tests.integration.conftest import (
    AKIHABARA,
    IKEBUKURO,
    JST,
    MEGURO,
    SHINAGAWA,
    UENO,
)

pytestmark = pytest.mark.integration


# ============================================================
# 経路検索 (POST /api/v1/routes/search)
# ============================================================


class TestSearchRoutesIntegrationV2:
    """経路検索エンドポイントの結合テスト (v2)."""

    async def test_search_transit_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-15: transit モードで池袋→品川の経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": IKEBUKURO["lat"],
                "origin_lon": IKEBUKURO["lon"],
                "destination_lat": SHINAGAWA["lat"],
                "destination_lon": SHINAGAWA["lon"],
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
        all_leg_modes = {
            leg["mode"]
            for it in data["itineraries"]
            for leg in it["legs"]
        }
        assert all_leg_modes & transit_modes, (
            f"transit search should include RAIL/SUBWAY/BUS legs, got {all_leg_modes}"
        )

    async def test_search_walking_v2(self, client: AsyncClient):
        """TC-16: walking モードで秋葉原→上野の徒歩経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": AKIHABARA["lat"],
                "origin_lon": AKIHABARA["lon"],
                "destination_lat": UENO["lat"],
                "destination_lon": UENO["lon"],
                "travel_mode": "walking",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) == 1

        it = data["itineraries"][0]
        for leg in it["legs"]:
            assert leg["mode"] == "WALK", f"walking mode should only have WALK legs, got {leg['mode']}"
        assert it["duration_minutes"] > 0

    async def test_search_cycling_v2(self, client: AsyncClient):
        """TC-17: cycling モードで目黒→品川の自転車経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": MEGURO["lat"],
                "origin_lon": MEGURO["lon"],
                "destination_lat": SHINAGAWA["lat"],
                "destination_lon": SHINAGAWA["lon"],
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

    async def test_search_driving_v2(self, client: AsyncClient):
        """TC-18: driving モードで上野→池袋の車経路検索が成功する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": UENO["lat"],
                "origin_lon": UENO["lon"],
                "destination_lat": IKEBUKURO["lat"],
                "destination_lon": IKEBUKURO["lon"],
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

    async def test_search_with_arrival_time_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-19: arrival_time 指定で上野→品川の到着逆算検索が動作する."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": UENO["lat"],
                "origin_lon": UENO["lon"],
                "destination_lat": SHINAGAWA["lat"],
                "destination_lon": SHINAGAWA["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["itineraries"]) >= 1

    async def test_search_home_fallback_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-20: origin 省略時にユーザーの home 座標がフォールバック使用される (目的地: 池袋)."""
        headers = await auth_headers(client)
        # origin_lat / origin_lon を省略 → UserSettings.home_lat/lon を使用
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "destination_lat": IKEBUKURO["lat"],
                "destination_lon": IKEBUKURO["lon"],
                "travel_mode": "transit",
                "arrival_time": future_arrival_time,
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200 with home fallback, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["itineraries"]) >= 1

    async def test_search_response_structure_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-21: transit 検索レスポンスの構造が API 仕様に準拠している (池袋→上野)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": IKEBUKURO["lat"],
                "origin_lon": IKEBUKURO["lon"],
                "destination_lat": UENO["lat"],
                "destination_lon": UENO["lon"],
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

    async def test_search_transit_multiple_results_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-22: transit 検索が複数の経路候補を返す — 品川→秋葉原 (first: 5)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": SHINAGAWA["lat"],
                "origin_lon": SHINAGAWA["lon"],
                "destination_lat": AKIHABARA["lat"],
                "destination_lon": AKIHABARA["lon"],
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


class TestDepartureTimeIntegrationV2:
    """出発時刻逆算エンドポイントの結合テスト (v2)."""

    async def test_departure_time_transit_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-23: transit モードの出発時刻逆算が成功する (目的地: 池袋)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": IKEBUKURO["lat"],
                "destination_lon": IKEBUKURO["lon"],
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

    async def test_departure_time_preparation_math_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-24: leave_home_at - start_preparation_at == preparation_minutes (30分) — 目的地: 品川."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": SHINAGAWA["lat"],
                "destination_lon": SHINAGAWA["lon"],
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

    async def test_departure_time_walking_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-25: walking モードの出発時刻逆算が成功する (目的地: 目黒)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": MEGURO["lat"],
                "destination_lon": MEGURO["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "walking",
            },
            headers=headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "leave_home_at" in data
        assert len(data["itineraries"]) >= 1

    async def test_departure_time_leave_before_arrival_v2(self, client: AsyncClient, future_arrival_time: str):
        """TC-26: leave_home_at が arrival_time より前であることを検証 (目的地: 上野)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/departure-time",
            json={
                "destination_lat": UENO["lat"],
                "destination_lon": UENO["lon"],
                "arrival_time": future_arrival_time,
                "travel_mode": "transit",
            },
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.json()

        leave = datetime.fromisoformat(data["leave_home_at"])
        arrival = datetime.fromisoformat(data["arrival_time"])
        assert leave < arrival, (
            f"leave_home_at ({leave}) should be before arrival_time ({arrival})"
        )


# ============================================================
# エラーケース
# ============================================================


class TestOTP2ErrorCasesIntegrationV2:
    """OTP2 エラーケースの結合テスト (v2)."""

    async def test_search_invalid_coordinates_v2(self, client: AsyncClient):
        """TC-27: GTFS 範囲外の座標 (北極付近 90, 0) で 404 ROUTE_NOT_FOUND が返る."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": 90.0,
                "origin_lon": 0.0,
                "destination_lat": 89.9,
                "destination_lon": 0.1,
                "travel_mode": "walking",
            },
            headers=headers,
        )

        # OTP2 がルートを見つけられない → 404
        assert resp.status_code in (404, 503), (
            f"Expected 404 or 503 for out-of-range coordinates, got {resp.status_code}: {resp.text}"
        )

    async def test_search_same_origin_destination_v2(self, client: AsyncClient):
        """TC-28: 出発地と目的地が同一座標の場合の動作確認 (池袋)."""
        headers = await auth_headers(client)
        resp = await client.post(
            "/api/v1/routes/search",
            json={
                "origin_lat": IKEBUKURO["lat"],
                "origin_lon": IKEBUKURO["lon"],
                "destination_lat": IKEBUKURO["lat"],
                "destination_lon": IKEBUKURO["lon"],
                "travel_mode": "walking",
            },
            headers=headers,
        )

        # 同一地点: OTP2 は 200 で 0 分の経路を返すか、404 を返す可能性がある
        assert resp.status_code in (200, 404), (
            f"Expected 200 or 404 for same origin/destination, got {resp.status_code}: {resp.text}"
        )
