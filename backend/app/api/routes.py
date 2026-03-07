from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.routes import (
    DepartureTimeRequest,
    DepartureTimeResponse,
    RouteSearchRequest,
    RouteSearchResponse,
)
from app.services import routes_service

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/search", response_model=RouteSearchResponse)
async def search_routes(
    data: RouteSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await routes_service.search_routes(db, current_user.id, data)


@router.post("/departure-time", response_model=DepartureTimeResponse)
async def calculate_departure_time(
    data: DepartureTimeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await routes_service.calculate_departure_time(db, current_user.id, data)
