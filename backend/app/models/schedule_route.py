from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BigInt

if TYPE_CHECKING:
    from app.models.schedule import Schedule


class ScheduleRoute(Base):
    __tablename__ = "schedule_routes"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    schedule_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    route_data: Mapped[str] = mapped_column(Text, nullable=False)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    schedule: Mapped[Schedule] = relationship(back_populates="selected_route")
