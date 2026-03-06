import datetime as dt

from pydantic import BaseModel


class LocationResponse(BaseModel):
    name: str
    lat: float
    lon: float


class WeatherResponse(BaseModel):
    date: dt.date
    location: LocationResponse
    temp_c: float
    condition: str
    condition_icon_url: str
    precip_mm: float
    chance_of_rain: int
    humidity: int
    wind_kph: float


class ForecastDayResponse(BaseModel):
    date: dt.date
    avg_temp_c: float
    max_temp_c: float
    min_temp_c: float
    condition: str
    condition_icon_url: str
    chance_of_rain: int


class ForecastResponse(BaseModel):
    location: LocationResponse
    forecast: list[ForecastDayResponse]
