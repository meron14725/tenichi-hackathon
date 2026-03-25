from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt


class SuggestionCache(Base):
    __tablename__ = "suggestion_caches"
    __table_args__ = (UniqueConstraint("prefecture_code", "target_date"),)

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    prefecture_code: Mapped[str] = mapped_column(String(2), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    suggestion_text: Mapped[str] = mapped_column(Text, nullable=False)
    weather_summary_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
