from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.template import Category


async def list_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.id))
    return list(result.scalars().all())
