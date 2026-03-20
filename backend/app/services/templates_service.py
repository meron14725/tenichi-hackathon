import datetime as dt

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.tag import schedule_tags, template_schedule_tags
from app.models.template import Template, TemplateSchedule
from app.schemas.templates import TemplateCreate, TemplateScheduleCreate, TemplateUpdate
from app.services.schedules_service import _validate_tag_ids


async def _get_owned_template(db: AsyncSession, user_id: int, template_id: int) -> Template:
    result = await db.execute(
        select(Template)
        .options(
            selectinload(Template.category),
            selectinload(Template.schedules).selectinload(TemplateSchedule.tags),
        )
        .where(Template.id == template_id, Template.user_id == user_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise AppError("NOT_FOUND", "Template not found", 404)
    return template


async def _create_template_schedules(
    db: AsyncSession, template_id: int, schedules_data: list[TemplateScheduleCreate]
) -> None:
    for s_data in schedules_data:
        await _validate_tag_ids(db, s_data.tag_ids)
        ts = TemplateSchedule(
            template_id=template_id,
            title=s_data.title,
            start_time=s_data.start_time,
            end_time=s_data.end_time,
            destination_name=s_data.destination_name,
            destination_address=s_data.destination_address,
            destination_lat=s_data.destination_lat,
            destination_lon=s_data.destination_lon,
            travel_mode=s_data.travel_mode,
            memo=s_data.memo,
            sort_order=s_data.sort_order,
        )
        db.add(ts)
        await db.flush()

        if s_data.tag_ids:
            for tag_id in s_data.tag_ids:
                await db.execute(template_schedule_tags.insert().values(template_schedule_id=ts.id, tag_id=tag_id))


async def list_templates(db: AsyncSession, user_id: int) -> list[Template]:
    result = await db.execute(
        select(Template)
        .options(
            selectinload(Template.category),
            selectinload(Template.schedules).selectinload(TemplateSchedule.tags),
        )
        .where(Template.user_id == user_id)
        .order_by(Template.id)
    )
    return list(result.scalars().all())


async def create_template(db: AsyncSession, user_id: int, data: TemplateCreate) -> Template:
    template = Template(
        user_id=user_id,
        name=data.name,
        category_id=data.category_id,
        memo=data.memo,
        departure_name=data.departure_name,
        departure_lat=data.departure_lat,
        departure_lng=data.departure_lng,
    )
    db.add(template)
    await db.flush()

    await _create_template_schedules(db, template.id, data.schedules)

    await db.commit()
    return await _get_owned_template(db, user_id, template.id)


async def get_template(db: AsyncSession, user_id: int, template_id: int) -> Template:
    return await _get_owned_template(db, user_id, template_id)


async def update_template(db: AsyncSession, user_id: int, template_id: int, data: TemplateUpdate) -> Template:
    template = await _get_owned_template(db, user_id, template_id)
    update_data = data.model_dump(exclude_unset=True)

    schedules_data = update_data.pop("schedules", None)

    if "category_id" in update_data:
        template.category_id = update_data.pop("category_id")

    for key, value in update_data.items():
        setattr(template, key, value)

    if schedules_data is not None:
        # Delete existing template schedules (cascade deletes junction table rows)
        template.schedules.clear()
        await db.flush()

        # Create new ones
        parsed = [TemplateScheduleCreate(**s) for s in schedules_data]
        await _create_template_schedules(db, template_id, parsed)

    await db.commit()
    db.expire(template)
    return await _get_owned_template(db, user_id, template_id)


async def delete_template(db: AsyncSession, user_id: int, template_id: int) -> Template:
    template = await _get_owned_template(db, user_id, template_id)
    await db.delete(template)
    await db.commit()


async def apply_template(db: AsyncSession, user_id: int, template_id: int, date: dt.date) -> list[Schedule]:
    template = await _get_owned_template(db, user_id, template_id)

    created_ids: list[int] = []
    for ts in sorted(template.schedules, key=lambda s: s.sort_order):
        start_at = dt.datetime.combine(date, ts.start_time)
        end_at = dt.datetime.combine(date, ts.end_time) if ts.end_time else None

        schedule = Schedule(
            user_id=user_id,
            title=ts.title,
            start_at=start_at,
            end_at=end_at,
            destination_name=ts.destination_name,
            destination_address=ts.destination_address,
            destination_lat=ts.destination_lat,
            destination_lon=ts.destination_lon,
            travel_mode=ts.travel_mode,
            memo=ts.memo,
        )
        db.add(schedule)
        await db.flush()

        # Copy tags via junction table insert
        for tag in ts.tags:
            await db.execute(schedule_tags.insert().values(schedule_id=schedule.id, tag_id=tag.id))

        created_ids.append(schedule.id)

    await db.commit()

    # Batch re-fetch with relationships (resolves N+1)
    result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.tags), selectinload(Schedule.selected_route))
        .where(Schedule.id.in_(created_ids))
        .order_by(Schedule.start_at)
    )
    return list(result.scalars().all())
