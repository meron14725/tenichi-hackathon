from datetime import time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AppError
from app.models.device_token import DeviceToken
from app.models.user import NotificationSettings
from app.schemas.notifications import DeviceTokenCreate, NotificationSettingsUpdate


async def get_notification_settings(db: AsyncSession, user_id: int) -> NotificationSettings:
    result = await db.execute(select(NotificationSettings).where(NotificationSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if settings is None:
        raise AppError("NOT_FOUND", "Notification settings not found", 404)
    return settings


async def update_notification_settings(
    db: AsyncSession, user_id: int, data: NotificationSettingsUpdate
) -> NotificationSettings:
    settings = await get_notification_settings(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return settings

    if "weather_notify_time" in update_data:
        v = update_data["weather_notify_time"]
        update_data["weather_notify_time"] = time(int(v[:2]), int(v[3:5]))

    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings


async def register_device_token(db: AsyncSession, user_id: int, data: DeviceTokenCreate) -> DeviceToken:
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == data.token))
    existing = result.scalar_one_or_none()
    if existing is not None:
        if existing.user_id == user_id:
            return existing
        await db.delete(existing)
        await db.flush()

    device_token = DeviceToken(
        user_id=user_id,
        token=data.token,
        platform=data.platform,
    )
    db.add(device_token)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError("CONFLICT", "Device token already registered", 409) from None
    await db.refresh(device_token)
    return device_token


async def delete_device_token(db: AsyncSession, user_id: int, token: str) -> None:
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == token, DeviceToken.user_id == user_id))
    device_token = result.scalar_one_or_none()
    if device_token is None:
        raise AppError("NOT_FOUND", "Device token not found", 404)

    await db.delete(device_token)
    await db.commit()
