import json
from datetime import datetime

from pydantic import BaseModel, field_validator, model_validator

VALID_TRAVEL_MODES = {"transit", "walking", "cycling", "driving"}


class RouteSearchRequest(BaseModel):
    origin_lat: float | None = None
    origin_lon: float | None = None
    destination_lat: float
    destination_lon: float
    travel_mode: str
    arrival_time: datetime | None = None

    @model_validator(mode="after")
    def validate_travel_mode(self):
        if self.travel_mode not in VALID_TRAVEL_MODES:
            msg = f"travel_mode must be one of {sorted(VALID_TRAVEL_MODES)}"
            raise ValueError(msg)
        return self


class DepartureTimeRequest(BaseModel):
    destination_lat: float
    destination_lon: float
    arrival_time: datetime
    travel_mode: str

    @model_validator(mode="after")
    def validate_travel_mode(self):
        if self.travel_mode not in VALID_TRAVEL_MODES:
            msg = f"travel_mode must be one of {sorted(VALID_TRAVEL_MODES)}"
            raise ValueError(msg)
        return self


class ScheduleRouteCreate(BaseModel):
    route_data: dict
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int


class LegResponse(BaseModel):
    mode: str
    from_name: str
    to_name: str
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    route_short_name: str | None = None
    route_long_name: str | None = None
    agency_name: str | None = None
    headsign: str | None = None


class ItineraryResponse(BaseModel):
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    number_of_transfers: int | None = None
    legs: list[LegResponse]


class RouteSearchResponse(BaseModel):
    itineraries: list[ItineraryResponse]


class DepartureTimeResponse(BaseModel):
    leave_home_at: datetime
    start_preparation_at: datetime
    preparation_minutes: int
    arrival_time: datetime
    itineraries: list[ItineraryResponse]


class ScheduleRouteResponse(BaseModel):
    id: int
    schedule_id: int
    route_data: dict
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("route_data", mode="before")
    @classmethod
    def parse_route_data(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v
