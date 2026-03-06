import datetime as dt
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.tags import TagResponse


class TemplateCategoryResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TemplateScheduleResponse(BaseModel):
    id: int
    title: str
    start_time: dt.time
    end_time: dt.time | None
    destination_name: str | None
    destination_address: str | None
    destination_lat: Decimal | None
    destination_lon: Decimal | None
    travel_mode: str | None
    memo: str | None
    sort_order: int
    tags: list[TagResponse]

    model_config = {"from_attributes": True}


class TemplateResponse(BaseModel):
    id: int
    name: str
    category: TemplateCategoryResponse | None
    schedules: list[TemplateScheduleResponse]
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True}


class TemplateScheduleCreate(BaseModel):
    title: str
    start_time: dt.time
    end_time: dt.time | None = None
    destination_name: str | None = None
    destination_address: str | None = None
    destination_lat: Decimal | None = None
    destination_lon: Decimal | None = None
    travel_mode: str | None = None
    memo: str | None = None
    tag_ids: list[int] = []
    sort_order: int = 0


class TemplateCreate(BaseModel):
    name: str
    category_id: int | None = None
    schedules: list[TemplateScheduleCreate] = []


class TemplateUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    schedules: list[TemplateScheduleCreate] | None = None


class TemplateApplyRequest(BaseModel):
    date: dt.date
