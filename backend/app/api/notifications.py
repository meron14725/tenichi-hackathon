from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.notifications import (
    DeviceTokenCreate,
    DeviceTokenResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
)
from app.services import notifications_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notifications_service.get_notification_settings(db, current_user.id)


@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notifications_service.update_notification_settings(db, current_user.id, data)


@router.post("/tokens", response_model=DeviceTokenResponse, status_code=201)
async def register_device_token(
    data: DeviceTokenCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notifications_service.register_device_token(db, current_user.id, data)


@router.delete("/tokens/{token}", status_code=204)
async def delete_device_token(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await notifications_service.delete_device_token(db, current_user.id, token)
