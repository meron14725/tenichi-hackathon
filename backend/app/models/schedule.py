from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt
from app.models.tag import Tag, schedule_tags

if TYPE_CHECKING:
    from app.models.schedule_list import ScheduleList
    from app.models.schedule_route import ScheduleRoute
    from app.models.schedule_suggestion_cache import ScheduleSuggestionCache
    from app.models.user import User


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInt, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_list_id: Mapped[int | None] = mapped_column(
        BigInt, ForeignKey("schedule_lists.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    destination_lon: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    travel_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_rule: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="schedules")
    schedule_list: Mapped[ScheduleList | None] = relationship(back_populates="schedules")
    tags: Mapped[list[Tag]] = relationship(secondary=schedule_tags, lazy="selectin", passive_deletes=True)
    selected_route: Mapped[ScheduleRoute | None] = relationship(
        back_populates="schedule", uselist=False, cascade="all, delete-orphan"
    )
    suggestion_cache: Mapped[ScheduleSuggestionCache | None] = relationship(
        back_populates="schedule", uselist=False, cascade="all, delete-orphan"
    )
