from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.tags import TagResponse


class SelectedRouteResponse(BaseModel):
    id: int
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int

    model_config = {"from_attributes": True}


class ScheduleResponse(BaseModel):
    id: int
    title: str
    start_at: datetime
    end_at: datetime | None
    destination_name: str | None
    destination_address: str | None
    destination_lat: Decimal | None
    destination_lon: Decimal | None
    travel_mode: str | None
    memo: str | None
    schedule_list_id: int | None
    tags: list[TagResponse]
    selected_route: SelectedRouteResponse | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    title: str
    start_at: datetime
    end_at: datetime | None = None
    destination_name: str | None = None
    destination_address: str | None = None
    destination_lat: Decimal | None = None
    destination_lon: Decimal | None = None
    travel_mode: str | None = None
    memo: str | None = None
    tag_ids: list[int] = []
    schedule_list_id: int | None = None


class ScheduleUpdate(BaseModel):
    title: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    destination_name: str | None = None
    destination_address: str | None = None
    destination_lat: Decimal | None = None
    destination_lon: Decimal | None = None
    travel_mode: str | None = None
    memo: str | None = None
    tag_ids: list[int] | None = None
    schedule_list_id: int | None = None
