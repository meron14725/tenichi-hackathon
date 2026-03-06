from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

import httpx

from app.config import settings
from app.exceptions import AppError

logger = logging.getLogger(__name__)

WEATHERAPI_BASE = "https://api.weatherapi.com/v1"


async def _fetch_forecast(
    q: str,
    days: int = 3,
    target_date: str | None = None,
) -> dict:
    """WeatherAPI.com の forecast.json を呼び出す."""
    if not settings.WEATHERAPI_KEY:
        raise AppError(
            "WEATHER_UNAVAILABLE",
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
            if resp.status_code != 200:
                logger.warning(
                    "WeatherAPI returned status %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                raise AppError(
                    "WEATHER_UNAVAILABLE",
                    "Weather API request failed",
                    502,
                )
            return resp.json()
    except AppError:
        raise
    except httpx.HTTPError:
        logger.exception("WeatherAPI connection error")
        raise AppError(
            "WEATHER_UNAVAILABLE",
            "Weather API is unavailable",
            502,
        ) from None
    except (KeyError, ValueError) as exc:
        logger.exception("WeatherAPI response parse error")
        raise AppError(
            "WEATHER_UNAVAILABLE",
            "Weather API returned unexpected response",
            502,
        ) from exc


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


def _build_forecast_day(day: dict) -> dict:
    d = day["day"]
    return {
        "date": day["date"],
        "avg_temp_c": d["avgtemp_c"],
        "max_temp_c": d["maxtemp_c"],
        "min_temp_c": d["mintemp_c"],
        "condition": d["condition"]["text"],
        "condition_icon_url": d["condition"]["icon"],
        "chance_of_rain": int(d["daily_chance_of_rain"]),
    }


async def get_weather(lat: float, lon: float, date: dt.date | None = None) -> dict:
    """指定日時・場所の天気を取得する."""
    target = date.isoformat() if date else dt.datetime.now(ZoneInfo("Asia/Tokyo")).date().isoformat()
    q = f"{lat},{lon}"

    data = await _fetch_forecast(q, days=3, target_date=target)

    try:
        forecast_days = data["forecast"]["forecastday"]
        for day in forecast_days:
            if day["date"] == target:
                return _build_day_weather(day, _build_location(data))
    except KeyError:
        logger.exception("WeatherAPI response structure error")
        raise AppError(
            "WEATHER_UNAVAILABLE",
            "Weather API returned unexpected response",
            502,
        ) from None

    raise AppError(
        "VALIDATION_ERROR",
        "Requested date is outside the available forecast range",
        400,
    )


async def get_forecast(lat: float, lon: float) -> dict:
    """3日間の天気予報を取得する."""
    q = f"{lat},{lon}"

    data = await _fetch_forecast(q, days=3)

    try:
        location = _build_location(data)
        forecast = [_build_forecast_day(day) for day in data["forecast"]["forecastday"]]
    except KeyError:
        logger.exception("WeatherAPI response structure error")
        raise AppError(
            "WEATHER_UNAVAILABLE",
            "Weather API returned unexpected response",
            502,
        ) from None

    return {"location": location, "forecast": forecast}
