from __future__ import annotations

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.user import User
from app.services import gemini_service

logger = logging.getLogger(__name__)

TRANSIT_MODES = {"RAIL", "SUBWAY", "BUS", "TRAM", "FERRY"}


def _extract_lines_from_route_data(route_data_json: str | None) -> list[dict]:
    """route_data JSON から交通路線情報を抽出する."""
    try:
        data = json.loads(route_data_json)
    except (json.JSONDecodeError, TypeError):
        return []

    lines: list[dict] = []
    seen: set[tuple] = set()

    itineraries = data.get("itineraries", [])
    for itin in itineraries:
        for leg in itin.get("legs", []):
            mode = leg.get("mode", "")
            if mode not in TRANSIT_MODES:
                continue
            route_short = leg.get("route_short_name", "")
            route_long = leg.get("route_long_name", "")
            agency = leg.get("agency_name", "")
            key = (mode, route_short, route_long, agency)
            if key not in seen:
                seen.add(key)
                lines.append(
                    {
                        "mode": mode,
                        "route_short_name": route_short or None,
                        "route_long_name": route_long or None,
                        "agency_name": agency or None,
                    }
                )
    return lines


def _format_lines_for_prompt(lines: list[dict]) -> str:
    """路線リストをGeminiプロンプト用テキストにフォーマットする."""
    if not lines:
        return "利用予定の路線はありません。"
    parts = []
    for line in lines:
        name = line.get("route_long_name") or line.get("route_short_name") or "不明"
        agency = line.get("agency_name") or ""
        mode = line.get("mode", "")
        part = f"- {name}"
        if agency:
            part += f"（{agency}）"
        if mode:
            part += f" [{mode}]"
        parts.append(part)
    return "\n".join(parts)


def _build_status_text(raw_response: str) -> str:
    """Gemini の JSON レスポンスからフロントエンド向けテキストを生成する."""
    cleaned = raw_response.strip()
    # マークダウンコードブロックを除去
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    if cleaned.lower() == "null" or cleaned == "":
        return "予定中の路線に運行の遅延はありません。"

    try:
        delays = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse Gemini transit status JSON: %s", cleaned[:200])
        return "予定中の路線に運行の遅延はありません。"

    if not delays or not isinstance(delays, list):
        return "予定中の路線に運行の遅延はありません。"

    parts = []
    for item in delays:
        line_name = item.get("line_name", "不明な路線")
        status = item.get("status", "遅延情報あり")
        parts.append(f"{line_name}で{status}が発生しています。")
    return "\n".join(parts)


async def get_transit_status(db: AsyncSession, user: User, schedule_list_id: int) -> dict:
    """スケジュールリストの路線運行状況を取得する."""
    stmt = (
        select(Schedule)
        .options(selectinload(Schedule.selected_route))
        .where(
            Schedule.schedule_list_id == schedule_list_id,
            Schedule.user_id == user.id,
        )
    )
    result = await db.execute(stmt)
    schedules = list(result.scalars().all())

    if not schedules:
        raise AppError("NOT_FOUND", "Schedule list not found or has no schedules", 404)

    all_lines: list[dict] = []
    seen_keys: set[tuple] = set()
    for schedule in schedules:
        if schedule.selected_route and schedule.selected_route.route_data:
            extracted = _extract_lines_from_route_data(schedule.selected_route.route_data)
            for line in extracted:
                key = (
                    line["mode"],
                    line.get("route_short_name"),
                    line.get("route_long_name"),
                    line.get("agency_name"),
                )
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_lines.append(line)

    if not all_lines:
        return {
            "schedule_list_id": schedule_list_id,
            "lines": [],
            "status_text": "利用予定の公共交通路線が見つかりませんでした。",
        }

    lines_text = _format_lines_for_prompt(all_lines)
    raw_response = await gemini_service.generate_transit_status(lines_text)
    status_text = _build_status_text(raw_response)

    return {
        "schedule_list_id": schedule_list_id,
        "lines": all_lines,
        "status_text": status_text,
    }
