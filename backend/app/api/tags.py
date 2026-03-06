from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.tags import TagResponse
from app.services import tags_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await tags_service.list_tags(db)
