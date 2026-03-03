import httpx
import os
from datetime import datetime, timezone, timedelta

OTP2_URL = os.getenv("OTP2_URL", "http://localhost:8080/otp/gtfs/v1")
JST = timezone(timedelta(hours=9))

# travel_mode -> OTP2 direct モード名のマッピング
# transit は専用クエリを使うため None
_DIRECT_MODE_MAP = {
    "walking": "WALK",
    "cycling": "BICYCLE",
    "driving": "CAR",
}


def _build_transit_query(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
    arrival_str: str,
    max_results: int,
) -> str:
    """transit モード用 GraphQL クエリを生成する。

    OTP2 v2.7.0 の planConnection は座標に CoordinateValue 型を使うため、
    GraphQL 変数（Float!）では型不一致エラーになる。インライン値で回避する。
    """
    return f"""
{{
  planConnection(
    origin:      {{ location: {{ coordinate: {{ latitude: {from_lat}, longitude: {from_lon} }} }} }}
    destination: {{ location: {{ coordinate: {{ latitude: {to_lat},   longitude: {to_lon}   }} }} }}
    dateTime: {{ latestArrival: "{arrival_str}" }}
    modes: {{
      transit: {{ transit: [{{ mode: RAIL }}, {{ mode: SUBWAY }}, {{ mode: BUS }}] }}
      direct: [WALK]
    }}
    first: {max_results}
  ) {{
    edges {{
      node {{
        start
        end
        numberOfTransfers
        legs {{
          mode
          from  {{ name }}
          to    {{ name }}
          start {{ scheduledTime }}
          end   {{ scheduledTime }}
          route {{ shortName longName agency {{ name }} }}
          trip  {{ headsign }}
        }}
      }}
    }}
  }}
}}
"""


def _build_direct_query(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
    arrival_str: str,
    otp_mode: str,
    max_results: int,
) -> str:
    """walking / cycling / driving モード用 GraphQL クエリを生成する。"""
    return f"""
{{
  planConnection(
    origin:      {{ location: {{ coordinate: {{ latitude: {from_lat}, longitude: {from_lon} }} }} }}
    destination: {{ location: {{ coordinate: {{ latitude: {to_lat},   longitude: {to_lon}   }} }} }}
    dateTime: {{ latestArrival: "{arrival_str}" }}
    modes: {{
      direct: [{otp_mode}]
    }}
    first: {max_results}
  ) {{
    edges {{
      node {{
        start
        end
        legs {{
          mode
          from  {{ name }}
          to    {{ name }}
          start {{ scheduledTime }}
          end   {{ scheduledTime }}
        }}
      }}
    }}
  }}
}}
"""


async def search_route(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
    arrival_time: datetime,
    travel_mode: str = "transit",
    max_results: int = 5,
) -> dict:
    """OTP2 に経路検索リクエストを送り、生レスポンスを返す。

    Args:
        from_lat: 出発地の緯度
        from_lon: 出発地の経度
        to_lat:   目的地の緯度
        to_lon:   目的地の経度
        arrival_time: 到着希望時刻（timezone-aware datetime）
        travel_mode: "transit" / "walking" / "cycling" / "driving"
        max_results: 返す経路候補の最大数（デフォルト 5）

    Returns:
        OTP2 GraphQL レスポンス dict

    Raises:
        httpx.HTTPStatusError: OTP2 サーバーが 4xx/5xx を返した場合
        httpx.ConnectError: OTP2 サーバーに接続できない場合
    """
    arrival_str = arrival_time.astimezone(JST).strftime("%Y-%m-%dT%H:%M:%S+09:00")

    otp_mode = _DIRECT_MODE_MAP.get(travel_mode)
    if otp_mode is not None:
        query = _build_direct_query(
            from_lat, from_lon, to_lat, to_lon, arrival_str, otp_mode, max_results
        )
    else:
        query = _build_transit_query(
            from_lat, from_lon, to_lat, to_lon, arrival_str, max_results
        )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(OTP2_URL, json={"query": query})
        resp.raise_for_status()
        return resp.json()
