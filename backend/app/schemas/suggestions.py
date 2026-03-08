import datetime as dt

from pydantic import BaseModel


class WeatherSummary(BaseModel):
    temp_c: float
    condition: str
    chance_of_rain: int


class TodaySuggestionResponse(BaseModel):
    date: dt.date
    suggestion: str
    weather_summary: WeatherSummary | None = None


class ScheduleSuggestionResponse(BaseModel):
    schedule_id: int
    suggestion: str
