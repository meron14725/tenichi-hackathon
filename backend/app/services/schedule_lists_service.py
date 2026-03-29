import datetime as dt
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule_list import PackingItem, ScheduleList
from app.schemas.schedule_lists import (
    PackingItemCreate,
    PackingItemUpdate,
    ScheduleListCreate,
    ScheduleListUpdate,
)
from app.services import suggestion_batch_service

logger = logging.getLogger(__name__)


async def _get_owned_list(db: AsyncSession, user_id: int, list_id: int) -> ScheduleList:
    result = await db.execute(
        select(ScheduleList)
        .options(
            selectinload(ScheduleList.category),
            selectinload(ScheduleList.schedules),
            selectinload(ScheduleList.packing_items),
        )
        .where(ScheduleList.id == list_id, ScheduleList.user_id == user_id)
    )
    sl = result.scalar_one_or_none()
    if sl is None:
        raise AppError("NOT_FOUND", "Schedule list not found", 404)
    return sl


async def list_schedule_lists(
    db: AsyncSession,
    user_id: int,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
) -> list[ScheduleList]:
    stmt = (
        select(ScheduleList)
        .options(
            selectinload(ScheduleList.category),
            selectinload(ScheduleList.schedules),
            selectinload(ScheduleList.packing_items),
        )
        .where(ScheduleList.user_id == user_id)
        .order_by(ScheduleList.date)
    )
    if start_date is not None:
        stmt = stmt.where(ScheduleList.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(ScheduleList.date <= end_date)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_schedule_list(db: AsyncSession, user_id: int, data: ScheduleListCreate) -> ScheduleList:
    sl = ScheduleList(
        user_id=user_id,
        name=data.name,
        date=data.date,
        category_id=data.category_id,
        memo=data.memo,
        departure_name=data.departure_name,
        departure_lat=data.departure_lat,
        departure_lng=data.departure_lng,
    )
    db.add(sl)
    await db.flush()

    for item_data in data.packing_items:
        item = PackingItem(schedule_list_id=sl.id, name=item_data.name, sort_order=item_data.sort_order)
        db.add(item)

    await db.commit()

    # 天気予報+LLM提案を即時生成（失敗してもリスト作成自体は成功させる）
    try:
        await suggestion_batch_service.generate_suggestion_for_schedule_list(
            db,
            user_id,
            data.date,
            float(data.departure_lat) if data.departure_lat else None,
            float(data.departure_lng) if data.departure_lng else None,
        )
    except Exception:
        logger.warning("Failed to generate suggestion on list creation for user %d", user_id)

    return await _get_owned_list(db, user_id, sl.id)


async def get_schedule_list(db: AsyncSession, user_id: int, list_id: int) -> ScheduleList:
    return await _get_owned_list(db, user_id, list_id)


async def update_schedule_list(db: AsyncSession, user_id: int, list_id: int, data: ScheduleListUpdate) -> ScheduleList:
    sl = await _get_owned_list(db, user_id, list_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sl, key, value)
    await db.commit()
    db.expire(sl)
    return await _get_owned_list(db, user_id, list_id)


async def delete_schedule_list(db: AsyncSession, user_id: int, list_id: int) -> None:
    sl = await _get_owned_list(db, user_id, list_id)
    await db.delete(sl)
    await db.commit()


# --- Packing Items ---


async def _get_owned_packing_item(db: AsyncSession, user_id: int, list_id: int, item_id: int) -> PackingItem:
    # Verify ownership via schedule_list
    await _get_owned_list(db, user_id, list_id)
    result = await db.execute(
        select(PackingItem).where(PackingItem.id == item_id, PackingItem.schedule_list_id == list_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise AppError("NOT_FOUND", "Packing item not found", 404)
    return item


async def create_packing_item(db: AsyncSession, user_id: int, list_id: int, data: PackingItemCreate) -> PackingItem:
    await _get_owned_list(db, user_id, list_id)
    item = PackingItem(schedule_list_id=list_id, name=data.name, sort_order=data.sort_order)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_packing_item(
    db: AsyncSession, user_id: int, list_id: int, item_id: int, data: PackingItemUpdate
) -> PackingItem:
    item = await _get_owned_packing_item(db, user_id, list_id, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


async def delete_packing_item(db: AsyncSession, user_id: int, list_id: int, item_id: int) -> None:
    item = await _get_owned_packing_item(db, user_id, list_id, item_id)
    await db.delete(item)
    await db.commit()
