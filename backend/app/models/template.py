from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt
from app.models.tag import Tag, template_schedule_tags

if TYPE_CHECKING:
    from app.models.schedule_list import ScheduleList
    from app.models.user import User


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    templates: Mapped[list[Template]] = relationship(back_populates="category")
    schedule_lists: Mapped[list[ScheduleList]] = relationship(back_populates="category")


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInt, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
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

    user: Mapped[User] = relationship(back_populates="templates")
    category: Mapped[Category | None] = relationship(back_populates="templates")
    schedules: Mapped[list[TemplateSchedule]] = relationship(
        back_populates="template", cascade="all, delete-orphan", lazy="selectin"
    )


class TemplateSchedule(Base):
    __tablename__ = "template_schedules"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(BigInt, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time | None] = mapped_column(Time, nullable=True)
    destination_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    destination_lon: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    travel_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    template: Mapped[Template] = relationship(back_populates="schedules")
    tags: Mapped[list[Tag]] = relationship(secondary=template_schedule_tags, lazy="selectin", passive_deletes=True)
