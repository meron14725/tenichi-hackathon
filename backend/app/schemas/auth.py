from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    home_address: str
    home_lat: float
    home_lon: float
    preparation_minutes: int
    reminder_minutes_before: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    expires_in: int


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class AccessTokenResponse(BaseModel):
    access_token: str
    expires_in: int
