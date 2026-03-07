from __future__ import annotations

import logging

import google.generativeai as genai

from app.config import settings
from app.exceptions import AppError

logger = logging.getLogger(__name__)

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise AppError(
                "SUGGESTIONS_UNAVAILABLE",
                "Gemini API key is not configured",
                503,
            )
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


async def generate_today_suggestion(
    schedules_text: str,
    weather_text: str,
) -> str:
    """今日の予定と天気情報から服装・持ち物の提案を生成する."""
    _ensure_configured()

    prompt = (
        "あなたは日本語で応答するスケジュールアシスタントです。\n"
        "以下のユーザーの今日の予定と天気情報をもとに、"
        "服装・持ち物のアドバイスを簡潔に提案してください。\n"
        "提案は1〜3文程度で、具体的かつ実用的にしてください。\n\n"
        f"【今日の予定】\n{schedules_text}\n\n"
        f"【天気情報】\n{weather_text}"
    )

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception:
        logger.exception("Gemini API call failed")
        raise AppError(
            "SUGGESTIONS_UNAVAILABLE",
            "Failed to generate suggestion",
            502,
        ) from None


async def generate_schedule_suggestion(schedule_text: str) -> str:
    """指定予定の情報から周辺スポット・アドバイスを生成する."""
    _ensure_configured()

    prompt = (
        "あなたは日本語で応答するスケジュールアシスタントです。\n"
        "以下の予定の情報をもとに、目的地周辺のおすすめスポットや"
        "その予定に関連した実用的なアドバイスを簡潔に提案してください。\n"
        "提案は1〜3文程度にしてください。\n\n"
        f"【予定情報】\n{schedule_text}"
    )

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception:
        logger.exception("Gemini API call failed")
        raise AppError(
            "SUGGESTIONS_UNAVAILABLE",
            "Failed to generate suggestion",
            502,
        ) from None
