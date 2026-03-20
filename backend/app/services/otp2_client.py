from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.exceptions import AppError

logger = logging.getLogger(__name__)


def _get_auth_headers() -> dict[str, str]:
    """OTP2 向け認証ヘッダーを取得する（本番環境のみ）."""
    if settings.ENVIRONMENT == "development":
        return {}

    import google.auth.transport.requests  # noqa: I001
    import google.oauth2.id_token
    from urllib.parse import urlparse

    # audience はベースURL（パスなし）にする必要がある
    parsed = urlparse(settings.OTP2_GRAPHQL_URL)
    audience = f"{parsed.scheme}://{parsed.netloc}"

    request = google.auth.transport.requests.Request()
    token = google.oauth2.id_token.fetch_id_token(request, audience)
    return {"Authorization": f"Bearer {token}"}


def _build_modes(travel_mode: str) -> str:
    """travel_mode を OTP2 GraphQL modes フラグメントに変換."""
    if travel_mode == "transit":
        return "{ transit: { transit: [{ mode: RAIL }, { mode: SUBWAY }, { mode: BUS }] } }"
    mode_map = {
        "walking": "WALK",
        "cycling": "BICYCLE",
        "driving": "CAR",
    }
    return f"{{ direct: [{mode_map[travel_mode]}] }}"


def _build_query(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    travel_mode: str,
    arrival_time: str | None = None,
    departure_time: str | None = None,
) -> str:
    """OTP2 planConnection GraphQL クエリを構築する."""
    modes = _build_modes(travel_mode)
    num_results = 5 if travel_mode == "transit" else 1

    if arrival_time:
        datetime_arg = f'dateTime: {{ latestArrival: "{arrival_time}" }}'
    elif departure_time:
        datetime_arg = f'dateTime: {{ earliestDeparture: "{departure_time}" }}'
    else:
        datetime_arg = ""

    return f"""
    {{
      planConnection(
        origin: {{
          location: {{ coordinate: {{ latitude: {origin_lat}, longitude: {origin_lon} }} }}
        }}
        destination: {{
          location: {{ coordinate: {{ latitude: {dest_lat}, longitude: {dest_lon} }} }}
        }}
        {datetime_arg}
        modes: {modes}
        first: {num_results}
      ) {{
        edges {{
          node {{
            start
            end
            duration
            numberOfTransfers
            legs {{
              mode
              route {{
                shortName
                longName
                agency {{ name }}
              }}
              from {{ name }}
              to {{ name }}
              start {{ scheduledTime }}
              end {{ scheduledTime }}
              headsign
            }}
          }}
        }}
      }}
    }}
    """


def _parse_leg(leg: dict) -> dict:
    """OTP2 の leg → API レスポンス形式に変換."""
    start_time = leg["start"]["scheduledTime"]
    end_time = leg["end"]["scheduledTime"]

    result: dict = {
        "mode": leg["mode"],
        "from_name": leg["from"]["name"],
        "to_name": leg["to"]["name"],
        "departure_time": start_time,
        "arrival_time": end_time,
    }

    # duration は start/end から計算（OTP2 の leg には duration がない）
    from datetime import datetime

    dep = datetime.fromisoformat(start_time)
    arr = datetime.fromisoformat(end_time)
    result["duration_minutes"] = max(1, int((arr - dep).total_seconds() / 60))

    # transit 専用フィールド
    route = leg.get("route")
    if route:
        if route.get("shortName"):
            result["route_short_name"] = route["shortName"]
        if route.get("longName"):
            result["route_long_name"] = route["longName"]
        agency = route.get("agency")
        if agency and agency.get("name"):
            result["agency_name"] = agency["name"]
    if leg.get("headsign"):
        result["headsign"] = leg["headsign"]

    return result


def _parse_itineraries(data: dict) -> list[dict]:
    """OTP2 レスポンス全体 → itineraries リストに変換."""
    edges = data.get("data", {}).get("planConnection", {}).get("edges", [])
    itineraries = []
    for edge in edges:
        node = edge["node"]
        duration_seconds = node.get("duration", 0)
        itinerary: dict = {
            "departure_time": node["start"],
            "arrival_time": node["end"],
            "duration_minutes": max(1, int(duration_seconds / 60)),
            "legs": [_parse_leg(leg) for leg in node.get("legs", [])],
        }
        num_transfers = node.get("numberOfTransfers")
        if num_transfers is not None:
            itinerary["number_of_transfers"] = num_transfers
        itineraries.append(itinerary)
    return itineraries


async def search_routes(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    travel_mode: str,
    arrival_time: str | None = None,
    departure_time: str | None = None,
) -> list[dict]:
    """経路検索リクエストを送信し、itineraries を返す.

    driving/walking は Google Routes API v2、transit/cycling は OTP2 を使用。
    """
    if travel_mode in ("driving", "walking"):
        from app.services.google_routes_client import search_routes_google

        return await search_routes_google(
            origin_lat,
            origin_lon,
            dest_lat,
            dest_lon,
            travel_mode,
            arrival_time=arrival_time,
            departure_time=departure_time,
        )

    query = _build_query(
        origin_lat,
        origin_lon,
        dest_lat,
        dest_lon,
        travel_mode,
        arrival_time=arrival_time,
        departure_time=departure_time,
    )

    try:
        headers = _get_auth_headers()
        headers["Content-Type"] = "application/json"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.OTP2_GRAPHQL_URL,
                json={"query": query},
                headers=headers,
                timeout=30.0,
            )
            if resp.status_code != 200:
                logger.warning("OTP2 returned status %d: %s", resp.status_code, resp.text[:200])
                raise AppError("OTP_UNAVAILABLE", "Route planning service request failed", 503)

            data = resp.json()

            # GraphQL エラーチェック
            if data.get("errors"):
                logger.warning("OTP2 GraphQL error: %s", data["errors"][0].get("message"))
                raise AppError("ROUTE_NOT_FOUND", "No routes found for the specified conditions", 404)
    except AppError:
        raise
    except httpx.HTTPError:
        logger.exception("OTP2 connection error")
        raise AppError("OTP_UNAVAILABLE", "Route planning service is unavailable", 503) from None

    itineraries = _parse_itineraries(data)

    # OTP2は指定モード以外のlegを含むルートを代替として返すことがある
    # 各モードで許可されるleg modeのみ含むitineraryにフィルタする
    _expected_modes: dict[str, set[str]] = {
        "transit": {"WALK", "RAIL", "SUBWAY", "BUS"},
        "walking": {"WALK"},
        "cycling": {"BICYCLE", "WALK"},
        "driving": {"CAR", "WALK"},
    }
    allowed = _expected_modes.get(travel_mode)
    if allowed:
        itineraries = [it for it in itineraries if all(leg["mode"] in allowed for leg in it["legs"])]
        # transit: 徒歩のみルートも除外
        if travel_mode == "transit":
            itineraries = [it for it in itineraries if any(leg["mode"] != "WALK" for leg in it["legs"])]

    if not itineraries:
        raise AppError("ROUTE_NOT_FOUND", "No routes found for the specified conditions", 404)

    return itineraries
