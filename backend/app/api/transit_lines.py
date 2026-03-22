from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.exceptions import AppError
from app.models.user import User
from app.schemas.transit_lines import TransitLineResponse
from app.services import transit_lines_service

router = APIRouter(prefix="/transit-lines", tags=["transit-lines"])


@router.get("", response_model=list[TransitLineResponse])
async def list_transit_lines(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await transit_lines_service.list_transit_lines(db)


@router.get("/{line_id}", response_model=TransitLineResponse)
async def get_transit_line(
    line_id: int,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    line = await transit_lines_service.get_transit_line(db, line_id)
    if line is None:
        raise AppError("NOT_FOUND", "Transit line not found", 404)
    return line
