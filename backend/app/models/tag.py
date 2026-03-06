from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BigInt

# Junction table: Schedule <-> Tag
schedule_tags = Table(
    "schedule_tags",
    Base.metadata,
    Column("schedule_id", BigInt, ForeignKey("schedules.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", BigInt, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# Junction table: TemplateSchedule <-> Tag
template_schedule_tags = Table(
    "template_schedule_tags",
    Base.metadata,
    Column("template_schedule_id", BigInt, ForeignKey("template_schedules.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", BigInt, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
