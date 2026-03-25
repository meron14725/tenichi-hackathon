"""バッチ処理用認証依存関数."""

from __future__ import annotations

import secrets

from fastapi import Header

from app.config import settings
from app.exceptions import AppError


async def verify_batch_secret(
    x_batch_secret: str = Header(..., alias="X-Batch-Secret"),
) -> None:
    """X-Batch-Secret ヘッダーの値を検証する."""
    if not settings.BATCH_SECRET:
        raise AppError("BATCH_UNAVAILABLE", "Batch secret is not configured", 503)
    if not secrets.compare_digest(x_batch_secret, settings.BATCH_SECRET):
        raise AppError("UNAUTHORIZED", "Invalid batch secret", 401)
