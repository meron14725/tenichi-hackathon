"""スケジュール個別提案のキャッシュ生成・参照・無効化."""

from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.models.schedule_suggestion_cache import ScheduleSuggestionCache
from app.models.weather_cache import WeatherCache
from app.services import gemini_service, weather_service
from app.services.prefecture import PREFECTURES, find_nearest_prefecture
from app.services.suggestions_service import (
    _format_schedule_for_prompt,
    _format_weather_for_prompt,
)

logger = logging.getLogger(__name__)

# WeatherAPI.com の予報取得可能日数上限
_WEATHER_FORECAST_MAX_DAYS = 15


async def get_weather_for_schedule(
    db: AsyncSession,
    schedule: Schedule,
) -> tuple[dict | None, str | None]:
    """スケジュールの目的地天気を取得する。

    Returns:
        (weather_summary_dict, weather_text) のタプル。
        天気取得不可の場合は (None, None)。
    """
    if schedule.destination_lat is None or schedule.destination_lon is None:
        return None, None

    lat = float(schedule.destination_lat)
    lon = float(schedule.destination_lon)
    target_date = schedule.start_at.astimezone(ZoneInfo("Asia/Tokyo")).date()

    # 都道府県コードを特定
    pref_code = find_nearest_prefecture(lat, lon)

    # 1. weather_caches から取得を試みる
    result = await db.execute(
        select(WeatherCache).where(
            WeatherCache.prefecture_code == pref_code,
            WeatherCache.target_date == target_date,
        )
    )
    cached_weather = result.scalar_one_or_none()

    if cached_weather:
        weather_data = {
            "temp_c": cached_weather.temp_c,
            "condition": cached_weather.condition,
            "chance_of_rain": cached_weather.chance_of_rain,
            "humidity": cached_weather.humidity,
            "precip_mm": cached_weather.precip_mm,
            "wind_kph": cached_weather.wind_kph,
        }
        weather_summary = {
            "temp_c": cached_weather.temp_c,
            "condition": cached_weather.condition,
            "chance_of_rain": cached_weather.chance_of_rain,
        }
        weather_text = _format_weather_for_prompt(weather_data)
        return weather_summary, weather_text

    # 2. キャッシュなし + 15日以内 → WeatherAPIリアルタイム取得
    today = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date()
    days_ahead = (target_date - today).days

    if 0 <= days_ahead <= _WEATHER_FORECAST_MAX_DAYS:
        try:
            weather_data = await weather_service.get_weather(lat, lon, target_date)
            weather_summary = {
                "temp_c": weather_data["temp_c"],
                "condition": weather_data["condition"],
                "chance_of_rain": weather_data["chance_of_rain"],
            }
            weather_text = _format_weather_for_prompt(weather_data)
            return weather_summary, weather_text
        except Exception:
            logger.warning(
                "Realtime weather fetch failed for schedule %s (lat=%s, lon=%s)",
                schedule.id,
                lat,
                lon,
            )

    # 3. 16日以降 or 天気取得失敗 → 天気なし
    return None, None


async def generate_and_cache(
    db: AsyncSession,
    schedule: Schedule,
) -> ScheduleSuggestionCache:
    """スケジュール提案を生成しDBにキャッシュする."""
    weather_summary, weather_text = await get_weather_for_schedule(db, schedule)

    schedule_text = _format_schedule_for_prompt(schedule)
    suggestion = await gemini_service.generate_schedule_suggestion(schedule_text, weather_text)

    stmt = pg_insert(ScheduleSuggestionCache).values(
        schedule_id=schedule.id,
        user_id=schedule.user_id,
        suggestion_text=suggestion,
        weather_summary_json=weather_summary,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["schedule_id"],
        set_={
            "suggestion_text": stmt.excluded.suggestion_text,
            "weather_summary_json": stmt.excluded.weather_summary_json,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    await db.execute(stmt)
    await db.flush()

    # 挿入/更新した行を返す
    result = await db.execute(
        select(ScheduleSuggestionCache).where(
            ScheduleSuggestionCache.schedule_id == schedule.id
        )
    )
    return result.scalar_one()


async def get_cached(
    db: AsyncSession,
    schedule_id: int,
) -> ScheduleSuggestionCache | None:
    """キャッシュ済み提案を取得する."""
    result = await db.execute(
        select(ScheduleSuggestionCache).where(
            ScheduleSuggestionCache.schedule_id == schedule_id
        )
    )
    return result.scalar_one_or_none()


async def invalidate(db: AsyncSession, schedule_id: int) -> None:
    """スケジュール提案キャッシュを削除する."""
    await db.execute(
        delete(ScheduleSuggestionCache).where(
            ScheduleSuggestionCache.schedule_id == schedule_id
        )
    )
