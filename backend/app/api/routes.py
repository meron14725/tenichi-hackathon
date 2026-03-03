from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta, timezone

from app.schemas.routes import (
    DepartureTimeRequest,
    DepartureTimeResponse,
    Itinerary,
    ItineraryLeg,
)
from app.services.otp_client import search_route
from app.api.deps import get_current_user

router = APIRouter()
JST = timezone(timedelta(hours=9))


def _to_iso_jst(dt_str: str) -> str:
    """ISO 8601 文字列を JST オフセット付き ISO 8601 文字列に変換する。"""
    return datetime.fromisoformat(dt_str).astimezone(JST).isoformat()


def _duration_minutes(start_str: str, end_str: str) -> int:
    """2つの ISO 8601 文字列の差分を分で返す。"""
    start = datetime.fromisoformat(start_str)
    end = datetime.fromisoformat(end_str)
    return max(0, round((end - start).total_seconds() / 60))


def _parse_edges(data: dict) -> list:
    """OTP2 レスポンスから edges を取得する。経路なし時は HTTPException を送出。"""
    edges = data.get("data", {}).get("planConnection", {}).get("edges", [])
    if not edges:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "ROUTE_NOT_FOUND",
                    "message": "指定条件で経路が見つかりませんでした。時刻・区間を確認してください。",
                }
            },
        )
    return edges


def _build_itineraries(edges: list, travel_mode: str) -> list[Itinerary]:
    """OTP2 edges から Itinerary のリストを生成する。"""
    itineraries = []
    for edge in edges:
        node = edge["node"]
        legs = []

        for leg in node["legs"]:
            mode = leg["mode"]
            leg_obj = ItineraryLeg(
                mode=mode,
                from_name=leg["from"]["name"],
                to_name=leg["to"]["name"],
                departure_time=_to_iso_jst(leg["start"]["scheduledTime"]),
                arrival_time=_to_iso_jst(leg["end"]["scheduledTime"]),
                duration_minutes=_duration_minutes(
                    leg["start"]["scheduledTime"],
                    leg["end"]["scheduledTime"],
                ),
            )

            # transit モードの非徒歩区間に路線・事業者情報を付与
            if travel_mode == "transit" and mode != "WALK":
                route = leg.get("route") or {}
                agency = route.get("agency") or {}
                trip = leg.get("trip") or {}
                leg_obj.route_short_name = route.get("shortName") or route.get("longName")
                leg_obj.agency_name = agency.get("name")
                leg_obj.headsign = trip.get("headsign")

            legs.append(leg_obj)

        number_of_transfers = node.get("numberOfTransfers") if travel_mode == "transit" else None

        itineraries.append(
            Itinerary(
                departure_time=_to_iso_jst(node["start"]),
                arrival_time=_to_iso_jst(node["end"]),
                duration_minutes=_duration_minutes(node["start"], node["end"]),
                number_of_transfers=number_of_transfers,
                legs=legs,
            )
        )

    return itineraries


@router.post(
    "/routes/departure-time",
    response_model=DepartureTimeResponse,
    summary="出発時刻逆算・経路候補取得",
    description=(
        "目的地座標と到着希望時刻を受け取り、家を出るべき時刻と経路候補を返す。"
        "出発地・身支度時間は UserSettings から自動取得する。"
    ),
)
async def get_departure_time(
    req: DepartureTimeRequest,
    current_user=Depends(get_current_user),
) -> DepartureTimeResponse:
    # UserSettings の取得
    # Phase 3 で実装される User.settings から home_lat / home_lon / preparation_minutes を取得
    settings = current_user.settings

    if settings.home_lat is None or settings.home_lon is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "HOME_LOCATION_NOT_SET",
                    "message": "自宅の座標が未設定です。UserSettings で home_lat / home_lon を設定してください。",
                }
            },
        )

    # OTP2 に経路検索
    try:
        data = await search_route(
            from_lat=settings.home_lat,
            from_lon=settings.home_lon,
            to_lat=req.destination_lat,
            to_lon=req.destination_lon,
            arrival_time=req.arrival_time,
            travel_mode=req.travel_mode,
            max_results=5,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": {
                    "code": "OTP_UNAVAILABLE",
                    "message": "OTP2 サーバーへの接続に失敗しました。しばらく時間をおいて再試行してください。",
                }
            },
        )

    edges = _parse_edges(data)
    itineraries = _build_itineraries(edges, req.travel_mode)

    # leave_home_at = 最速ルートの出発時刻（OTP2 が origin からの出発時刻を返す）
    leave_home_at = itineraries[0].departure_time

    # start_preparation_at = leave_home_at - preparation_minutes
    leave_home_dt = datetime.fromisoformat(leave_home_at)
    start_preparation_dt = leave_home_dt - timedelta(minutes=settings.preparation_minutes)
    start_preparation_at = start_preparation_dt.isoformat()

    # arrival_time を ISO 8601 JST 文字列に正規化（確認用）
    arrival_time_str = req.arrival_time.astimezone(JST).isoformat()

    return DepartureTimeResponse(
        leave_home_at=leave_home_at,
        start_preparation_at=start_preparation_at,
        preparation_minutes=settings.preparation_minutes,
        arrival_time=arrival_time_str,
        itineraries=itineraries,
    )
