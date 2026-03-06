import datetime as dt

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.schedule_lists import (
    PackingItemCreate,
    PackingItemResponse,
    PackingItemUpdate,
    ScheduleListCreate,
    ScheduleListResponse,
    ScheduleListUpdate,
)
from app.services import schedule_lists_service

router = APIRouter(prefix="/schedule-lists", tags=["schedule-lists"])


@router.get("", response_model=list[ScheduleListResponse])
async def list_schedule_lists(
    start_date: dt.date | None = Query(None),
    end_date: dt.date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.list_schedule_lists(db, current_user.id, start_date, end_date)


@router.post("", response_model=ScheduleListResponse, status_code=201)
async def create_schedule_list(
    data: ScheduleListCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.create_schedule_list(db, current_user.id, data)


@router.get("/{list_id}", response_model=ScheduleListResponse)
async def get_schedule_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.get_schedule_list(db, current_user.id, list_id)


@router.put("/{list_id}", response_model=ScheduleListResponse)
async def update_schedule_list(
    list_id: int,
    data: ScheduleListUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.update_schedule_list(db, current_user.id, list_id, data)


@router.delete("/{list_id}", status_code=204)
async def delete_schedule_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await schedule_lists_service.delete_schedule_list(db, current_user.id, list_id)
    return Response(status_code=204)


# --- Packing Items ---


@router.post("/{list_id}/packing-items", response_model=PackingItemResponse, status_code=201)
async def create_packing_item(
    list_id: int,
    data: PackingItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.create_packing_item(db, current_user.id, list_id, data)


@router.put("/{list_id}/packing-items/{item_id}", response_model=PackingItemResponse)
async def update_packing_item(
    list_id: int,
    item_id: int,
    data: PackingItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await schedule_lists_service.update_packing_item(db, current_user.id, list_id, item_id, data)


@router.delete("/{list_id}/packing-items/{item_id}", status_code=204)
async def delete_packing_item(
    list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await schedule_lists_service.delete_packing_item(db, current_user.id, list_id, item_id)
    return Response(status_code=204)
