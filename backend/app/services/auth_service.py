from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AppError
from app.models.refresh_token import RefreshToken
from app.models.user import NotificationSettings, User, UserSettings
from app.schemas.auth import RegisterRequest
from app.utils.auth import (
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)


async def register(db: AsyncSession, data: RegisterRequest) -> tuple[User, str, str]:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise AppError("CONFLICT", "Email already registered", 409)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
    )
    db.add(user)
    await db.flush()

    user_settings = UserSettings(
        user_id=user.id,
        home_address=data.home_address,
        home_lat=data.home_lat,
        home_lon=data.home_lon,
        preparation_minutes=data.preparation_minutes,
        reminder_minutes_before=data.reminder_minutes_before,
    )
    notification_settings = NotificationSettings(user_id=user.id)
    db.add(user_settings)
    db.add(notification_settings)

    access_token = create_access_token(user.id)
    raw_refresh_token = create_refresh_token()
    refresh_token = RefreshToken(
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)

    await db.commit()
    await db.refresh(user)

    return user, access_token, raw_refresh_token


async def login(db: AsyncSession, email: str, password: str) -> tuple[str, str]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise AppError("UNAUTHORIZED", "Invalid email or password", 401)

    access_token = create_access_token(user.id)
    raw_refresh_token = create_refresh_token()
    refresh_token = RefreshToken(
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.commit()

    return access_token, raw_refresh_token


async def refresh(db: AsyncSession, token: str) -> str:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.revoked_at.is_(None),
        )
    )
    refresh_token = result.scalar_one_or_none()

    if refresh_token is None:
        raise AppError("UNAUTHORIZED", "Invalid refresh token", 401)

    if refresh_token.expires_at < datetime.now(UTC):
        raise AppError("UNAUTHORIZED", "Refresh token has expired", 401)

    access_token = create_access_token(refresh_token.user_id)
    return access_token


async def logout(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
    await db.commit()
