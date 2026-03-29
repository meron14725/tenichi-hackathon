"""バッチ処理用内部エンドポイント.

Cloud Scheduler から定時に呼び出されることを想定。
X-Batch-Secret ヘッダーで認証する。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies.batch_auth import verify_batch_secret
from app.services import suggestion_batch_service, weather_batch_service

router = APIRouter(
    prefix="/internal/batch",
    tags=["batch"],
    dependencies=[Depends(verify_batch_secret)],
)


@router.post("/weather")
async def batch_weather(db=Depends(get_db)):  # noqa: ANN001
    """47都道府県の天気を一括取得してDBに保存する."""
    result = await weather_batch_service.fetch_all_prefectures_weather(db)
    return result


@router.post("/suggestions")
async def batch_suggestions(db=Depends(get_db)):  # noqa: ANN001
    """当日スケジュールを持つ全ユーザーのLLM文言を一括生成してDBに保存する."""
    result = await suggestion_batch_service.generate_all_suggestions(db)
    return result
