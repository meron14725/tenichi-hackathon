from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.user import User, UserSettings
from app.services import gemini_service, weather_service

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


async def get_today_suggestion(db: AsyncSession, user: User) -> dict:
    """今日の提案を生成する."""
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

    # 天気情報を取得
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
            logger.warning("Weather fetch failed for user %s: %s", user.id, e.message)
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
