import datetime as dt

from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.weather import ForecastResponse, WeatherResponse
from app.services import weather_service

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(..., description="緯度"),
    lon: float = Query(..., description="経度"),
    date: dt.date | None = Query(None, description="対象日付 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
):
    return await weather_service.get_weather(lat, lon, date)


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    lat: float = Query(..., description="緯度"),
    lon: float = Query(..., description="経度"),
    current_user: User = Depends(get_current_user),
):
    return await weather_service.get_forecast(lat, lon)
