from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt


class TransitLine(Base):
    __tablename__ = "transit_lines"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    line_key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name_ja: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    color: Mapped[str] = mapped_column(String(10), nullable=False)
    operator: Mapped[str | None] = mapped_column(String(100), nullable=True)
