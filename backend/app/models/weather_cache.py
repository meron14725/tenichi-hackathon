from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt


class WeatherCache(Base):
    __tablename__ = "weather_caches"
    __table_args__ = (UniqueConstraint("prefecture_code", "target_date"),)

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    prefecture_code: Mapped[str] = mapped_column(String(2), nullable=False)
    prefecture_name: Mapped[str] = mapped_column(String(10), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    condition: Mapped[str] = mapped_column(String(100), nullable=False)
    condition_icon_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    precip_mm: Mapped[float] = mapped_column(Float, nullable=False)
    chance_of_rain: Mapped[int] = mapped_column(Integer, nullable=False)
    humidity: Mapped[int] = mapped_column(Integer, nullable=False)
    wind_kph: Mapped[float] = mapped_column(Float, nullable=False)
    weather_severity: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
