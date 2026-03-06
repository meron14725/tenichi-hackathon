from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AppError
from app.models.user import User, UserSettings
from app.schemas.users import UserProfileUpdate, UserSettingsUpdate


async def update_profile(db: AsyncSession, user: User, data: UserProfileUpdate) -> User:
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return user

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


async def get_settings(db: AsyncSession, user_id: int) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if settings is None:
        raise AppError("NOT_FOUND", "Settings not found", 404)
    return settings


async def update_settings(db: AsyncSession, user_id: int, data: UserSettingsUpdate) -> UserSettings:
    settings = await get_settings(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return settings

    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings
