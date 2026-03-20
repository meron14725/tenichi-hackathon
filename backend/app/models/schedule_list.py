from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt

if TYPE_CHECKING:
    from app.models.schedule import Schedule
    from app.models.template import Category
    from app.models.user import User


class ScheduleList(Base):
    __tablename__ = "schedule_lists"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInt, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    category_id: Mapped[int | None] = mapped_column(
        BigInt, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    memo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    departure_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    departure_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    departure_lng: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="schedule_lists")
    category: Mapped[Category | None] = relationship(back_populates="schedule_lists")
    schedules: Mapped[list[Schedule]] = relationship(back_populates="schedule_list")
    packing_items: Mapped[list[PackingItem]] = relationship(
        back_populates="schedule_list", cascade="all, delete-orphan"
    )


class PackingItem(Base):
    __tablename__ = "packing_items"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    schedule_list_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("schedule_lists.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_checked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    schedule_list: Mapped[ScheduleList] = relationship(back_populates="packing_items")
