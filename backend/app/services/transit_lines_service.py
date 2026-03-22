from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transit_line import TransitLine


async def list_transit_lines(db: AsyncSession) -> list[TransitLine]:
    result = await db.execute(select(TransitLine).order_by(TransitLine.id))
    return list(result.scalars().all())


async def get_transit_line(db: AsyncSession, line_id: int) -> TransitLine | None:
    result = await db.execute(select(TransitLine).where(TransitLine.id == line_id))
    return result.scalar_one_or_none()
