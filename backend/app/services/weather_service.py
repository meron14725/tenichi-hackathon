from __future__ import annotations

import datetime as dt

import httpx

from app.config import settings
from app.exceptions import AppError

WEATHERAPI_BASE = "https://api.weatherapi.com/v1"


async def _fetch_forecast(
    q: str,
    days: int = 3,
    target_date: str | None = None,
) -> dict:
    """WeatherAPI.com の forecast.json を呼び出す."""
    if not settings.WEATHERAPI_KEY:
        raise AppError(
            "EXTERNAL_SERVICE_ERROR",
            "Weather API key is not configured",
            503,
        )

    params: dict[str, str | int] = {
        "key": settings.WEATHERAPI_KEY,
        "q": q,
        "days": days,
    }
    if target_date:
        params["dt"] = target_date

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{WEATHERAPI_BASE}/forecast.json",
                params=params,
                timeout=10.0,
            )
    except httpx.HTTPError:
        raise AppError(
            "EXTERNAL_SERVICE_ERROR",
            "Weather API is unavailable",
            502,
        ) from None

    if resp.status_code != 200:
        raise AppError(
            "EXTERNAL_SERVICE_ERROR",
            "Weather API request failed",
            502,
        )

    return resp.json()


def _build_location(data: dict) -> dict:
    loc = data["location"]
    return {"name": loc["name"], "lat": loc["lat"], "lon": loc["lon"]}


def _build_day_weather(day: dict, location: dict) -> dict:
    d = day["day"]
    return {
        "date": day["date"],
        "location": location,
        "temp_c": d["avgtemp_c"],
        "condition": d["condition"]["text"],
        "condition_icon_url": d["condition"]["icon"],
        "precip_mm": d["totalprecip_mm"],
        "chance_of_rain": int(d["daily_chance_of_rain"]),
        "humidity": int(d["avghumidity"]),
        "wind_kph": d["maxwind_kph"],
    }


async def get_weather(lat: float, lon: float, date: dt.date | None = None) -> dict:
    """指定日時・場所の天気を取得する."""
    target = date.isoformat() if date else dt.date.today().isoformat()
    q = f"{lat},{lon}"

    data = await _fetch_forecast(q, days=3, target_date=target)

    forecast_days = data["forecast"]["forecastday"]
    for day in forecast_days:
        if day["date"] == target:
            return _build_day_weather(day, _build_location(data))

    raise AppError(
        "VALIDATION_ERROR",
        "Requested date is outside the available forecast range",
        400,
    )


async def get_forecast(lat: float, lon: float) -> dict:
    """3日間の天気予報を取得する."""
    q = f"{lat},{lon}"

    data = await _fetch_forecast(q, days=3)
    location = _build_location(data)

    forecast = []
    for day in data["forecast"]["forecastday"]:
        d = day["day"]
        forecast.append(
            {
                "date": day["date"],
                "avg_temp_c": d["avgtemp_c"],
                "max_temp_c": d["maxtemp_c"],
                "min_temp_c": d["mintemp_c"],
                "condition": d["condition"]["text"],
                "condition_icon_url": d["condition"]["icon"],
                "chance_of_rain": int(d["daily_chance_of_rain"]),
            }
        )

    return {"location": location, "forecast": forecast}
