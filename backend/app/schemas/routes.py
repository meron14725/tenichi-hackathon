from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class DepartureTimeRequest(BaseModel):
    destination_lat: float
    destination_lon: float
    arrival_time: datetime
    travel_mode: str  # "transit" / "walking" / "cycling" / "driving"

    @field_validator("travel_mode")
    @classmethod
    def validate_travel_mode(cls, v: str) -> str:
        allowed = {"transit", "walking", "cycling", "driving"}
        if v not in allowed:
            raise ValueError(f"travel_mode は {allowed} のいずれかである必要があります")
        return v


class ItineraryLeg(BaseModel):
    mode: str                              # "WALK" / "RAIL" / "SUBWAY" / "BUS" / "BICYCLE" / "CAR"
    from_name: str                         # 出発地名
    to_name: str                           # 到着地名
    departure_time: str                    # ISO 8601 JST: "2026-03-10T18:12:00+09:00"
    arrival_time: str                      # ISO 8601 JST
    duration_minutes: int                  # 区間所要時間（分）
    route_short_name: Optional[str] = None  # 路線名（transit のみ）
    agency_name: Optional[str] = None       # 事業者名（transit のみ）
    headsign: Optional[str] = None          # 行き先（transit のみ）


class Itinerary(BaseModel):
    departure_time: str                    # ISO 8601 JST: 家を出る時刻 = OTP2 の itinerary start
    arrival_time: str                      # ISO 8601 JST
    duration_minutes: int                  # 総所要時間（分）
    number_of_transfers: Optional[int] = None  # 乗り換え回数（transit のみ）
    legs: List[ItineraryLeg]


class DepartureTimeResponse(BaseModel):
    leave_home_at: str           # ISO 8601 JST: itineraries[0].departure_time
    start_preparation_at: str    # ISO 8601 JST: leave_home_at - preparation_minutes
    preparation_minutes: int     # UserSettings から取得した身支度時間（確認用）
    arrival_time: str            # ISO 8601 JST: リクエストで指定した到着時刻（確認用）
    itineraries: List[Itinerary]  # 経路候補（最大 5 件）。itineraries[0] が最速ルート
