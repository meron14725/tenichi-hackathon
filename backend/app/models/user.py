from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt

if TYPE_CHECKING:
    from app.models.refresh_token import RefreshToken  # noqa: F401
    from app.models.schedule import Schedule  # noqa: F401
    from app.models.schedule_list import ScheduleList  # noqa: F401
    from app.models.template import Template  # noqa: F401


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    settings: Mapped[UserSettings] = relationship(back_populates="user")
    notification_settings: Mapped[NotificationSettings] = relationship(back_populates="user")
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(back_populates="user")
    schedules: Mapped[list[Schedule]] = relationship(back_populates="user")
    schedule_lists: Mapped[list[ScheduleList]] = relationship(back_populates="user")
    templates: Mapped[list[Template]] = relationship(back_populates="user")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    home_address: Mapped[str] = mapped_column(String(255), nullable=False)
    home_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    home_lon: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    preparation_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    reminder_minutes_before: Mapped[int] = mapped_column(Integer, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Asia/Tokyo")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="settings")


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    weather_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    weather_notify_time: Mapped[dt.time] = mapped_column(Time, nullable=False, server_default="07:00:00")
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="notification_settings")
