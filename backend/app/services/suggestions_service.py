from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.suggestion_cache import SuggestionCache
from app.models.user import User, UserSettings
from app.models.weather_cache import WeatherCache
from app.services import gemini_service, weather_service
from app.services.prefecture import find_nearest_prefecture

logger = logging.getLogger(__name__)


def _format_schedules_for_prompt(schedules: list[Schedule]) -> str:
    if not schedules:
        return "今日の予定はありません。"

    lines = []
    for s in schedules:
        parts = [f"- {s.title}"]
        parts.append(f"開始: {s.start_at.strftime('%H:%M')}")
        if s.end_at:
            parts.append(f"終了: {s.end_at.strftime('%H:%M')}")
        if s.destination_name:
            parts.append(f"場所: {s.destination_name}")
        if s.tags:
            parts.append(f"タグ: {', '.join(t.name for t in s.tags)}")
        if s.memo:
            parts.append(f"メモ: {s.memo}")
        lines.append(" / ".join(parts))
    return "\n".join(lines)


def _format_weather_for_prompt(weather: dict) -> str:
    return (
        f"天気: {weather['condition']}, "
        f"気温: {weather['temp_c']}℃, "
        f"降水確率: {weather['chance_of_rain']}%, "
        f"湿度: {weather['humidity']}%"
    )


def _format_schedule_for_prompt(schedule: Schedule) -> str:
    parts = [f"タイトル: {schedule.title}"]
    parts.append(f"開始: {schedule.start_at.isoformat()}")
    if schedule.end_at:
        parts.append(f"終了: {schedule.end_at.isoformat()}")
    if schedule.destination_name:
        parts.append(f"目的地: {schedule.destination_name}")
    if schedule.destination_address:
        parts.append(f"住所: {schedule.destination_address}")
    if schedule.tags:
        parts.append(f"タグ: {', '.join(t.name for t in schedule.tags)}")
    if schedule.memo:
        parts.append(f"メモ: {schedule.memo}")
    return "\n".join(parts)


def _collect_prefecture_codes(
    schedules: list[Schedule],
    user_settings: UserSettings | None,
) -> list[str]:
    """スケジュールの目的地から都道府県コードを収集する。目的地がなければ自宅を使用."""
    codes = []
    for s in schedules:
        if s.destination_lat and s.destination_lon:
            code = find_nearest_prefecture(float(s.destination_lat), float(s.destination_lon))
            codes.append(code)

    if not codes and user_settings and user_settings.home_lat and user_settings.home_lon:
        codes.append(
            find_nearest_prefecture(float(user_settings.home_lat), float(user_settings.home_lon))
        )

    return codes


async def _get_worst_weather_suggestion(
    db: AsyncSession,
    prefecture_codes: list[str],
    today: dt.date,
) -> dict | None:
    """指定された都道府県コードの中で最も天気が悪い場所のキャッシュ済み提案を返す."""
    if not prefecture_codes:
        return None

    unique_codes = list(set(prefecture_codes))

    # 最悪天気の都道府県を取得
    result = await db.execute(
        select(WeatherCache)
        .where(
            WeatherCache.target_date == today,
            WeatherCache.prefecture_code.in_(unique_codes),
        )
        .order_by(WeatherCache.weather_severity.desc())
        .limit(1)
    )
    worst_weather = result.scalar_one_or_none()

    if worst_weather is None:
        return None

    # 対応するサジェスションキャッシュを取得
    suggestion_result = await db.execute(
        select(SuggestionCache).where(
            SuggestionCache.prefecture_code == worst_weather.prefecture_code,
            SuggestionCache.target_date == today,
        )
    )
    suggestion_cache = suggestion_result.scalar_one_or_none()

    if suggestion_cache is None:
        return None

    return {
        "suggestion": suggestion_cache.suggestion_text,
        "weather_summary": suggestion_cache.weather_summary_json,
    }


async def _fallback_realtime_suggestion(
    user_settings: UserSettings | None,
    schedules: list[Schedule],
    today: dt.date,
) -> dict:
    """キャッシュがない場合の従来リアルタイム生成フォールバック."""
    weather_summary = None
    if user_settings and user_settings.home_lat and user_settings.home_lon:
        try:
            weather_data = await weather_service.get_weather(
                float(user_settings.home_lat),
                float(user_settings.home_lon),
                today,
            )
            weather_summary = {
                "temp_c": weather_data["temp_c"],
                "condition": weather_data["condition"],
                "chance_of_rain": weather_data["chance_of_rain"],
            }
            weather_text = _format_weather_for_prompt(weather_data)
        except AppError as e:
            logger.warning("Weather fetch failed for fallback: %s", e.message)
            weather_text = "天気情報は取得できませんでした。"
    else:
        weather_text = "自宅の座標が設定されていないため天気情報は取得できませんでした。"

    schedules_text = _format_schedules_for_prompt(schedules)
    suggestion = await gemini_service.generate_today_suggestion(schedules_text, weather_text)

    return {
        "date": today.isoformat(),
        "suggestion": suggestion,
        "weather_summary": weather_summary,
    }


async def get_today_suggestion(db: AsyncSession, user: User) -> dict:
    """今日の提案を生成する（キャッシュ優先、フォールバックあり）."""
    # ユーザー設定から自宅座標を取得
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()

    tz = ZoneInfo(user_settings.timezone if user_settings else "Asia/Tokyo")
    today = dt.datetime.now(tz).date()

    # 今日のスケジュールを取得
    stmt = (
        select(Schedule)
        .options(selectinload(Schedule.tags))
        .where(
            Schedule.user_id == user.id,
            Schedule.start_at >= dt.datetime.combine(today, dt.time.min, tzinfo=tz),
            Schedule.start_at < dt.datetime.combine(today + dt.timedelta(days=1), dt.time.min, tzinfo=tz),
        )
        .order_by(Schedule.start_at)
    )
    schedules_result = await db.execute(stmt)
    schedules = list(schedules_result.scalars().all())

    # 目的地から都道府県コードを収集
    prefecture_codes = _collect_prefecture_codes(schedules, user_settings)

    # キャッシュから最悪天気の提案を取得
    cached = await _get_worst_weather_suggestion(db, prefecture_codes, today)
    if cached:
        return {
            "date": today.isoformat(),
            "suggestion": cached["suggestion"],
            "weather_summary": cached["weather_summary"],
        }

    # フォールバック: 従来のリアルタイム生成
    logger.info("Cache miss for user %s, falling back to realtime generation", user.id)
    return await _fallback_realtime_suggestion(user_settings, schedules, today)


async def get_schedule_suggestion(db: AsyncSession, user: User, schedule_id: int) -> dict:
    """指定予定の提案を生成する."""
    result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.tags))
        .where(Schedule.id == schedule_id, Schedule.user_id == user.id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise AppError("NOT_FOUND", "Schedule not found", 404)

    schedule_text = _format_schedule_for_prompt(schedule)
    suggestion = await gemini_service.generate_schedule_suggestion(schedule_text)

    return {
        "schedule_id": schedule.id,
        "suggestion": suggestion,
    }
