"""都道府県別LLM文言をバッチ生成してDBに保存するサービス."""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.suggestion_cache import SuggestionCache
from app.models.weather_cache import WeatherCache
from app.services import gemini_service

logger = logging.getLogger(__name__)

_CONCURRENCY = 5
_MAX_RETRIES = 2
_RETRY_DELAY = 2.0


async def _generate_suggestion_for_weather(weather: WeatherCache) -> dict | None:
    """1都道府県の天気からLLM文言を生成する。失敗時はリトライし、最終的にNoneを返す."""
    for attempt in range(_MAX_RETRIES):
        try:
            suggestion = await gemini_service.generate_weather_suggestion(
                prefecture_name=weather.prefecture_name,
                condition=weather.condition,
                temp_c=weather.temp_c,
                chance_of_rain=weather.chance_of_rain,
                humidity=weather.humidity,
                wind_kph=weather.wind_kph,
                precip_mm=weather.precip_mm,
            )
            return {
                "prefecture_code": weather.prefecture_code,
                "target_date": weather.target_date,
                "suggestion_text": suggestion,
                "weather_summary_json": {
                    "temp_c": weather.temp_c,
                    "condition": weather.condition,
                    "chance_of_rain": weather.chance_of_rain,
                },
            }
        except Exception:
            if attempt < _MAX_RETRIES - 1:
                logger.warning(
                    "Retrying suggestion generation for %s (%s), attempt %d",
                    weather.prefecture_name, weather.prefecture_code, attempt + 1,
                )
                await asyncio.sleep(_RETRY_DELAY)
            else:
                logger.exception(
                    "Failed to generate suggestion for %s (%s) after %d attempts",
                    weather.prefecture_name, weather.prefecture_code, _MAX_RETRIES,
                )
    return None


async def generate_all_suggestions(db: AsyncSession) -> dict:
    """全都道府県のLLM文言を生成してDBに保存する."""
    today = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date()

    # 当日の天気キャッシュを取得
    result = await db.execute(
        select(WeatherCache).where(WeatherCache.target_date == today)
    )
    weather_caches = list(result.scalars().all())

    if not weather_caches:
        logger.warning("No weather caches found for %s", today)
        return {"success": 0, "failed": 0, "skipped": 0, "date": today.isoformat()}

    # 既存のサジェスションキャッシュを確認
    existing_result = await db.execute(
        select(SuggestionCache.prefecture_code).where(SuggestionCache.target_date == today)
    )
    existing_codes = set(existing_result.scalars().all())

    # 未生成のもののみ対象
    to_generate = [w for w in weather_caches if w.prefecture_code not in existing_codes]
    skipped = len(weather_caches) - len(to_generate)

    sem = asyncio.Semaphore(_CONCURRENCY)

    async def _gen_with_semaphore(weather: WeatherCache) -> dict | None:
        async with sem:
            return await _generate_suggestion_for_weather(weather)

    tasks = [_gen_with_semaphore(w) for w in to_generate]
    results = await asyncio.gather(*tasks)

    success_count = 0
    fail_count = 0

    for result_data in results:
        if result_data is None:
            fail_count += 1
            continue

        stmt = pg_insert(SuggestionCache).values(**result_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=["prefecture_code", "target_date"],
            set_={
                "suggestion_text": stmt.excluded.suggestion_text,
                "weather_summary_json": stmt.excluded.weather_summary_json,
                "updated_at": dt.datetime.now(dt.timezone.utc),
            },
        )
        await db.execute(stmt)
        success_count += 1

    await db.commit()

    logger.info(
        "Suggestion batch completed: %d success, %d failed, %d skipped",
        success_count,
        fail_count,
        skipped,
    )
    return {
        "success": success_count,
        "failed": fail_count,
        "skipped": skipped,
        "date": today.isoformat(),
    }
