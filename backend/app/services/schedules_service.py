import datetime as dt
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.tag import Tag, schedule_tags
from app.schemas.schedules import ScheduleCreate, ScheduleUpdate
from app.services import schedule_suggestion_service

logger = logging.getLogger(__name__)


async def _get_owned_schedule(db: AsyncSession, user_id: int, schedule_id: int) -> Schedule:
    result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.tags), selectinload(Schedule.selected_route))
        .where(Schedule.id == schedule_id, Schedule.user_id == user_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise AppError("NOT_FOUND", "Schedule not found", 404)
    return schedule


async def _validate_tag_ids(db: AsyncSession, tag_ids: list[int]) -> None:
    """tag_ids の存在チェック."""
    if not tag_ids:
        return
    result = await db.execute(select(Tag.id).where(Tag.id.in_(tag_ids)))
    found_ids = set(result.scalars().all())
    missing = set(tag_ids) - found_ids
    if missing:
        raise AppError(
            "VALIDATION_ERROR",
            f"Tags not found: {sorted(missing)}",
            400,
        )


async def list_schedules(
    db: AsyncSession,
    user_id: int,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
) -> list[Schedule]:
    stmt = (
        select(Schedule)
        .options(selectinload(Schedule.tags), selectinload(Schedule.selected_route))
        .where(Schedule.user_id == user_id)
        .order_by(Schedule.start_at)
    )
    if start_date is not None:
        stmt = stmt.where(Schedule.start_at >= dt.datetime.combine(start_date, dt.time.min))
    if end_date is not None:
        stmt = stmt.where(Schedule.start_at < dt.datetime.combine(end_date + dt.timedelta(days=1), dt.time.min))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_schedule(db: AsyncSession, user_id: int, data: ScheduleCreate) -> Schedule:
    await _validate_tag_ids(db, data.tag_ids)

    schedule = Schedule(
        user_id=user_id,
        title=data.title,
        start_at=data.start_at,
        end_at=data.end_at,
        destination_name=data.destination_name,
        destination_address=data.destination_address,
        destination_lat=data.destination_lat,
        destination_lon=data.destination_lon,
        travel_mode=data.travel_mode,
        memo=data.memo,
        schedule_list_id=data.schedule_list_id,
    )
    db.add(schedule)
    await db.flush()

    if data.tag_ids:
        for tag_id in data.tag_ids:
            await db.execute(schedule_tags.insert().values(schedule_id=schedule.id, tag_id=tag_id))

    await db.commit()

    # LLM提案を即時生成してキャッシュ（失敗してもスケジュール作成は成功させる）
    try:
        await schedule_suggestion_service.generate_and_cache(db, schedule)
        await db.commit()
    except Exception:
        logger.warning("Failed to generate suggestion cache for schedule %s", schedule.id)
        await db.rollback()

    return await _get_owned_schedule(db, user_id, schedule.id)


async def get_schedule(db: AsyncSession, user_id: int, schedule_id: int) -> Schedule:
    return await _get_owned_schedule(db, user_id, schedule_id)


async def update_schedule(db: AsyncSession, user_id: int, schedule_id: int, data: ScheduleUpdate) -> Schedule:
    schedule = await _get_owned_schedule(db, user_id, schedule_id)
    update_data = data.model_dump(exclude_unset=True)

    tag_ids = update_data.pop("tag_ids", None)

    for key, value in update_data.items():
        setattr(schedule, key, value)

    if tag_ids is not None:
        await _validate_tag_ids(db, tag_ids)
        # Clear existing tags via raw SQL, then re-add
        await db.execute(schedule_tags.delete().where(schedule_tags.c.schedule_id == schedule_id))
        for tag_id in tag_ids:
            await db.execute(schedule_tags.insert().values(schedule_id=schedule_id, tag_id=tag_id))

    await db.commit()

    # スケジュール更新時はキャッシュを無効化（次回アクセス時に再生成）
    try:
        await schedule_suggestion_service.invalidate(db, schedule_id)
        await db.commit()
    except Exception:
        logger.warning("Failed to invalidate suggestion cache for schedule %s", schedule_id)
        await db.rollback()

    db.expire(schedule)
    return await _get_owned_schedule(db, user_id, schedule_id)


async def delete_schedule(db: AsyncSession, user_id: int, schedule_id: int) -> None:
    schedule = await _get_owned_schedule(db, user_id, schedule_id)
    await db.delete(schedule)
    await db.commit()
