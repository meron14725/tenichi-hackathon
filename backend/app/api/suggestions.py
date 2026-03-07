from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.suggestions import ScheduleSuggestionResponse, TodaySuggestionResponse
from app.services import suggestions_service

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.get("/today", response_model=TodaySuggestionResponse)
async def get_today_suggestion(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await suggestions_service.get_today_suggestion(db, current_user)


@router.get("/{schedule_id}", response_model=ScheduleSuggestionResponse)
async def get_schedule_suggestion(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await suggestions_service.get_schedule_suggestion(db, current_user, schedule_id)
