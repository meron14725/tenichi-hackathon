from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.transit_status import TransitStatusResponse
from app.services import transit_status_service

router = APIRouter(prefix="/transit-status", tags=["transit-status"])


@router.get("", response_model=TransitStatusResponse)
async def get_transit_status(
    schedule_list_id: int = Query(..., description="スケジュールリストID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await transit_status_service.get_transit_status(db, current_user, schedule_list_id)
