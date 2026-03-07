import re
from datetime import datetime, time
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, Field, field_validator


def _time_to_str(v: time | str) -> str:
    if isinstance(v, time):
        return v.strftime("%H:%M")
    return v


class NotificationSettingsResponse(BaseModel):
    weather_enabled: bool
    weather_notify_time: Annotated[str, BeforeValidator(_time_to_str)]
    reminder_enabled: bool

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    weather_enabled: bool | None = None
    weather_notify_time: str | None = None
    reminder_enabled: bool | None = None

    @field_validator("weather_notify_time")
    @classmethod
    def validate_time_format(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError("weather_notify_time cannot be null")
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("weather_notify_time must be in HH:MM format")
        h, m = int(v[:2]), int(v[3:5])
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError("weather_notify_time must be a valid time (00:00-23:59)")
        return v


class DeviceTokenCreate(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    platform: Literal["ios", "android"]


class DeviceTokenResponse(BaseModel):
    id: int
    token: str
    platform: str
    created_at: datetime

    model_config = {"from_attributes": True}
