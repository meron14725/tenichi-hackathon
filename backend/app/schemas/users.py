from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    name: str | None = None


class UserSettingsResponse(BaseModel):
    home_address: str
    home_lat: Decimal | None
    home_lon: Decimal | None
    preparation_minutes: int
    reminder_minutes_before: int
    timezone: str

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    home_address: str | None = None
    home_lat: Decimal | None = None
    home_lon: Decimal | None = None
    preparation_minutes: int | None = None
    reminder_minutes_before: int | None = None
    timezone: str | None = None
