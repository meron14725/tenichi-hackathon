from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.routes import ScheduleRouteCreate, ScheduleRouteResponse
from app.services import routes_service

router = APIRouter(prefix="/schedules", tags=["schedule-routes"])


@router.post("/{schedule_id}/route", response_model=ScheduleRouteResponse, status_code=201)
async def save_route(
    schedule_id: int,
    data: ScheduleRouteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await routes_service.save_route(db, current_user.id, schedule_id, data)


@router.get("/{schedule_id}/route", response_model=ScheduleRouteResponse)
async def get_route(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await routes_service.get_route(db, current_user.id, schedule_id)


@router.delete("/{schedule_id}/route", status_code=204)
async def delete_route(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await routes_service.delete_route(db, current_user.id, schedule_id)
    return Response(status_code=204)
