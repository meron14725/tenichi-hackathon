import datetime as dt

from pydantic import BaseModel


class PackingItemResponse(BaseModel):
    id: int
    name: str
    is_checked: bool
    sort_order: int

    model_config = {"from_attributes": True}


class PackingItemCreate(BaseModel):
    name: str
    sort_order: int = 0


class PackingItemUpdate(BaseModel):
    name: str | None = None
    is_checked: bool | None = None
    sort_order: int | None = None


class ScheduleSummary(BaseModel):
    id: int
    title: str
    start_at: dt.datetime
    end_at: dt.datetime | None

    model_config = {"from_attributes": True}


class ScheduleListResponse(BaseModel):
    id: int
    name: str
    date: dt.date
    schedules: list[ScheduleSummary]
    packing_items: list[PackingItemResponse]
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class ScheduleListCreate(BaseModel):
    name: str
    date: dt.date
    packing_items: list[PackingItemCreate] = []


class ScheduleListUpdate(BaseModel):
    name: str | None = None
    date: dt.date | None = None
