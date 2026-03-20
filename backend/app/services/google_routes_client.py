from __future__ import annotations

import logging
from datetime import UTC, datetime

import httpx

from app.config import settings
from app.exceptions import AppError

logger = logging.getLogger(__name__)

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
ROUTES_API_SCOPE = "https://www.googleapis.com/auth/cloud-platform"

_TRAVEL_MODE_MAP = {
    "driving": "DRIVE",
    "walking": "WALK",
}


def _get_access_token() -> str:
    """Google Cloud のアクセストークンを取得する（ADC / サービスアカウント）."""
    import google.auth
    import google.auth.transport.requests

    credentials, _ = google.auth.default(scopes=[ROUTES_API_SCOPE])
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token


async def search_routes_google(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    travel_mode: str,
    arrival_time: str | None = None,
    departure_time: str | None = None,
) -> list[dict]:
    """Google Routes API v2 で車・徒歩の経路検索を行う."""
    google_mode = _TRAVEL_MODE_MAP.get(travel_mode)
    if not google_mode:
        raise AppError("INVALID_MODE", f"Unsupported travel mode for Google Routes: {travel_mode}", 400)

    body: dict = {
        "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lon}}},
        "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lon}}},
        "travelMode": google_mode,
        "languageCode": "ja",
    }

    if departure_time:
        body["departureTime"] = departure_time
    elif arrival_time and google_mode == "DRIVE":
        # arrivalTime は DRIVE モードのみ対応
        body["arrivalTime"] = arrival_time

    try:
        token = _get_access_token()
    except Exception:
        logger.exception("Failed to get Google Cloud access token")
        raise AppError("GOOGLE_ROUTES_ERROR", "Failed to authenticate with Google Cloud", 503) from None

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "X-Goog-User-Project": settings.GCP_PROJECT_ID,
        "X-Goog-FieldMask": "routes.duration,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(ROUTES_API_URL, json=body, headers=headers, timeout=30.0)

            if resp.status_code != 200:
                logger.warning("Google Routes API returned status %d: %s", resp.status_code, resp.text[:200])
                raise AppError("GOOGLE_ROUTES_ERROR", "Google Routes API request failed", 503)

            data = resp.json()
    except AppError:
        raise
    except httpx.HTTPError:
        logger.exception("Google Routes API connection error")
        raise AppError("GOOGLE_ROUTES_ERROR", "Google Routes API is unavailable", 503) from None

    return _parse_response(data, travel_mode)


def _parse_response(data: dict, travel_mode: str) -> list[dict]:
    """Google Routes API v2 レスポンスを OTP2 互換の itinerary 形式に変換."""
    routes = data.get("routes", [])
    if not routes:
        raise AppError("ROUTE_NOT_FOUND", "No routes found for the specified conditions", 404)

    itineraries = []
    for route in routes:
        duration_str = route.get("duration", "0s")
        duration_seconds = _parse_duration(duration_str)
        duration_minutes = max(1, int(duration_seconds / 60))

        now = datetime.now(UTC)
        departure_time = now.isoformat()
        arrival_time = now.isoformat()

        mode = "CAR" if travel_mode == "driving" else "WALK"

        legs = []
        for leg in route.get("legs", []):
            leg_duration_str = leg.get("duration", "0s")
            leg_duration_seconds = _parse_duration(leg_duration_str)
            leg_duration_minutes = max(1, int(leg_duration_seconds / 60))

            legs.append(
                {
                    "mode": mode,
                    "from_name": "出発地",
                    "to_name": "目的地",
                    "departure_time": departure_time,
                    "arrival_time": arrival_time,
                    "duration_minutes": leg_duration_minutes,
                }
            )

        itineraries.append(
            {
                "departure_time": departure_time,
                "arrival_time": arrival_time,
                "duration_minutes": duration_minutes,
                "legs": legs,
            }
        )

    return itineraries


def _parse_duration(duration_str: str) -> int:
    """Google の duration 文字列 (例: '845s') を秒数に変換."""
    if duration_str.endswith("s"):
        try:
            return int(float(duration_str[:-1]))
        except ValueError:
            return 0
    return 0
