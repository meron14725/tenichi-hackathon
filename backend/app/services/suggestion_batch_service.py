"""ユーザー別LLM文言をバッチ生成してDBに保存するサービス."""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.schedule import Schedule
from app.models.suggestion_cache import SuggestionCache
from app.models.user import UserSettings
from app.models.weather_cache import WeatherCache
from app.services import gemini_service
from app.services.prefecture import find_nearest_prefecture
from app.services.suggestions_service import (
    _format_schedules_for_prompt,
    _format_weather_for_prompt,
)

logger = logging.getLogger(__name__)

_CONCURRENCY = 5
_MAX_RETRIES = 2
_RETRY_DELAY = 2.0


async def _get_worst_weather_text(
    db: AsyncSession,
    schedules: list[Schedule],
    user_settings: UserSettings | None,
    today: dt.date,
) -> tuple[str, dict | None]:
    """スケジュール目的地の中で最悪天気を取得し、プロンプト用テキストとサマリーを返す."""
    codes: list[str] = []
    for s in schedules:
        if s.destination_lat and s.destination_lon:
            codes.append(find_nearest_prefecture(float(s.destination_lat), float(s.destination_lon)))

    if not codes and user_settings and user_settings.home_lat and user_settings.home_lon:
        codes.append(find_nearest_prefecture(float(user_settings.home_lat), float(user_settings.home_lon)))

    if not codes:
        return "天気情報は取得できませんでした。", None

    unique_codes = list(set(codes))
    result = await db.execute(
        select(WeatherCache)
        .where(
            WeatherCache.target_date == today,
            WeatherCache.prefecture_code.in_(unique_codes),
        )
        .order_by(WeatherCache.weather_severity.desc())
        .limit(1)
    )
    worst = result.scalar_one_or_none()
    if worst is None:
        return "天気情報は取得できませんでした。", None

    weather_dict = {
        "condition": worst.condition,
        "temp_c": worst.temp_c,
        "chance_of_rain": worst.chance_of_rain,
        "humidity": worst.humidity,
    }
    weather_text = _format_weather_for_prompt(weather_dict)
    weather_summary = {
        "temp_c": worst.temp_c,
        "condition": worst.condition,
        "chance_of_rain": worst.chance_of_rain,
    }
    return weather_text, weather_summary


async def _generate_suggestion_for_user(
    db: AsyncSession,
    user_id: int,
    schedules: list[Schedule],
    user_settings: UserSettings | None,
    today: dt.date,
) -> dict | None:
    """1ユーザーの提案をLLM生成する。失敗時はリトライし、最終的にNoneを返す."""
    for attempt in range(_MAX_RETRIES):
        try:
            weather_text, weather_summary = await _get_worst_weather_text(
                db, schedules, user_settings, today,
            )
            schedules_text = _format_schedules_for_prompt(schedules)
            suggestion = await gemini_service.generate_today_suggestion(
                schedules_text, weather_text,
            )
            return {
                "user_id": user_id,
                "target_date": today,
                "suggestion_text": suggestion,
                "weather_summary_json": weather_summary or {},
            }
        except Exception:
            if attempt < _MAX_RETRIES - 1:
                logger.warning(
                    "Retrying suggestion generation for user %d, attempt %d",
                    user_id, attempt + 1,
                )
                await asyncio.sleep(_RETRY_DELAY)
            else:
                logger.exception(
                    "Failed to generate suggestion for user %d after %d attempts",
                    user_id, _MAX_RETRIES,
                )
    return None


async def generate_all_suggestions(db: AsyncSession) -> dict:
    """当日スケジュールを持つ全ユーザーのLLM文言を生成してDBに保存する."""
    today = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date()
    today_start = dt.datetime.combine(today, dt.time.min, tzinfo=ZoneInfo("Asia/Tokyo"))
    today_end = dt.datetime.combine(today + dt.timedelta(days=1), dt.time.min, tzinfo=ZoneInfo("Asia/Tokyo"))

    # 当日スケジュールを持つユーザーIDを取得
    user_ids_result = await db.execute(
        select(Schedule.user_id)
        .where(Schedule.start_at >= today_start, Schedule.start_at < today_end)
        .distinct()
    )
    user_ids = list(user_ids_result.scalars().all())

    if not user_ids:
        logger.info("No users with schedules for %s", today)
        return {"success": 0, "failed": 0, "skipped": 0, "date": today.isoformat()}

    # 既存キャッシュがあるユーザーをスキップ
    existing_result = await db.execute(
        select(SuggestionCache.user_id).where(
            SuggestionCache.target_date == today,
            SuggestionCache.user_id.in_(user_ids),
        )
    )
    existing_user_ids = set(existing_result.scalars().all())
    target_user_ids = [uid for uid in user_ids if uid not in existing_user_ids]
    skipped = len(user_ids) - len(target_user_ids)

    if not target_user_ids:
        logger.info("All %d users already have cached suggestions", len(user_ids))
        return {"success": 0, "failed": 0, "skipped": skipped, "date": today.isoformat()}

    # ユーザー設定を一括取得
    settings_result = await db.execute(
        select(UserSettings).where(UserSettings.user_id.in_(target_user_ids))
    )
    settings_map: dict[int, UserSettings] = {
        s.user_id: s for s in settings_result.scalars().all()
    }

    # 各ユーザーのスケジュールを取得
    schedules_result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.tags))
        .where(
            Schedule.user_id.in_(target_user_ids),
            Schedule.start_at >= today_start,
            Schedule.start_at < today_end,
        )
        .order_by(Schedule.start_at)
    )
    all_schedules = list(schedules_result.scalars().all())

    # ユーザーIDごとにスケジュールをグルーピング
    user_schedules: dict[int, list[Schedule]] = {}
    for s in all_schedules:
        user_schedules.setdefault(s.user_id, []).append(s)

    sem = asyncio.Semaphore(_CONCURRENCY)

    async def _gen_with_semaphore(user_id: int) -> dict | None:
        async with sem:
            return await _generate_suggestion_for_user(
                db, user_id,
                user_schedules.get(user_id, []),
                settings_map.get(user_id),
                today,
            )

    tasks = [_gen_with_semaphore(uid) for uid in target_user_ids]
    results = await asyncio.gather(*tasks)

    success_count = 0
    fail_count = 0

    for result_data in results:
        if result_data is None:
            fail_count += 1
            continue

        stmt = pg_insert(SuggestionCache).values(**result_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "target_date"],
            set_={
                "suggestion_text": stmt.excluded.suggestion_text,
                "weather_summary_json": stmt.excluded.weather_summary_json,
                "updated_at": dt.datetime.now(dt.UTC),
            },
        )
        await db.execute(stmt)
        success_count += 1

    await db.commit()

    logger.info(
        "Suggestion batch completed: %d success, %d failed, %d skipped",
        success_count, fail_count, skipped,
    )
    return {
        "success": success_count,
        "failed": fail_count,
        "skipped": skipped,
        "date": today.isoformat(),
    }
