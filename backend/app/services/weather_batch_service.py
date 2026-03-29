"""47都道府県の天気をバッチ取得してDBに保存するサービス."""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weather_cache import WeatherCache
from app.services.prefecture import PREFECTURES, calc_weather_severity
from app.services.weather_service import build_day_weather, build_location, fetch_forecast_raw

logger = logging.getLogger(__name__)

# 同時並列数（WeatherAPI レート制限 10req/s に対し余裕を持つ）
_CONCURRENCY = 5
_MAX_RETRIES = 2
_RETRY_DELAY = 2.0


async def _fetch_prefecture_weather(
    code: str,
    name: str,
    lat: float,
    lon: float,
    target_date: dt.date,
) -> dict | None:
    """1都道府県の天気を取得する。失敗時はリトライし、最終的にNoneを返す."""
    date_str = target_date.isoformat()
    for attempt in range(_MAX_RETRIES):
        try:
            q = f"{lat},{lon}"
            data = await fetch_forecast_raw(q, days=1, target_date=date_str)
            forecast_days = data["forecast"]["forecastday"]
            for day in forecast_days:
                if day["date"] == date_str:
                    location = build_location(data)
                    weather = build_day_weather(day, location)
                    severity = calc_weather_severity(
                        weather["chance_of_rain"],
                        weather["precip_mm"],
                        weather["wind_kph"],
                        weather["condition"],
                    )
                    return {
                        "prefecture_code": code,
                        "prefecture_name": name,
                        "target_date": target_date,
                        "temp_c": weather["temp_c"],
                        "condition": weather["condition"],
                        "condition_icon_url": weather["condition_icon_url"],
                        "precip_mm": weather["precip_mm"],
                        "chance_of_rain": weather["chance_of_rain"],
                        "humidity": weather["humidity"],
                        "wind_kph": weather["wind_kph"],
                        "weather_severity": severity,
                        "raw_response": json.dumps(data, ensure_ascii=False),
                    }
        except Exception:
            if attempt < _MAX_RETRIES - 1:
                logger.warning(
                    "Retrying weather fetch for %s (%s), attempt %d",
                    name,
                    code,
                    attempt + 1,
                )
                await asyncio.sleep(_RETRY_DELAY)
            else:
                logger.exception(
                    "Failed to fetch weather for %s (%s) after %d attempts",
                    name,
                    code,
                    _MAX_RETRIES,
                )
    return None


async def fetch_all_prefectures_weather(db: AsyncSession) -> dict:
    """47都道府県の天気を取得してDBに保存する."""
    today = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date()

    sem = asyncio.Semaphore(_CONCURRENCY)

    async def _fetch_with_semaphore(code: str, name: str, lat: float, lon: float) -> dict | None:
        async with sem:
            return await _fetch_prefecture_weather(code, name, lat, lon, today)

    tasks = [_fetch_with_semaphore(code, name, lat, lon) for code, (name, lat, lon) in PREFECTURES.items()]
    results = await asyncio.gather(*tasks)

    success_count = 0
    fail_count = 0

    for result in results:
        if result is None:
            fail_count += 1
            continue

        stmt = pg_insert(WeatherCache).values(**result)
        stmt = stmt.on_conflict_do_update(
            index_elements=["prefecture_code", "target_date"],
            set_={
                "temp_c": stmt.excluded.temp_c,
                "condition": stmt.excluded.condition,
                "condition_icon_url": stmt.excluded.condition_icon_url,
                "precip_mm": stmt.excluded.precip_mm,
                "chance_of_rain": stmt.excluded.chance_of_rain,
                "humidity": stmt.excluded.humidity,
                "wind_kph": stmt.excluded.wind_kph,
                "weather_severity": stmt.excluded.weather_severity,
                "raw_response": stmt.excluded.raw_response,
                "updated_at": dt.datetime.now(dt.UTC),
            },
        )
        await db.execute(stmt)
        success_count += 1

    await db.commit()

    logger.info(
        "Weather batch completed: %d success, %d failed",
        success_count,
        fail_count,
    )
    return {"success": success_count, "failed": fail_count, "date": today.isoformat()}


async def get_weather_cache_for_date(
    db: AsyncSession,
    target_date: dt.date,
) -> list[WeatherCache]:
    """指定日の全都道府県天気キャッシュを取得する."""
    result = await db.execute(select(WeatherCache).where(WeatherCache.target_date == target_date))
    return list(result.scalars().all())
