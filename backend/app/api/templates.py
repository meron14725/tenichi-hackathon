from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.schedules import ScheduleResponse
from app.schemas.templates import (
    TemplateApplyRequest,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)
from app.services import templates_service

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await templates_service.list_templates(db, current_user.id)


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await templates_service.create_template(db, current_user.id, data)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await templates_service.get_template(db, current_user.id, template_id)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await templates_service.update_template(db, current_user.id, template_id, data)


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await templates_service.delete_template(db, current_user.id, template_id)
    return Response(status_code=204)


@router.post("/{template_id}/apply", response_model=list[ScheduleResponse], status_code=201)
async def apply_template(
    template_id: int,
    data: TemplateApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await templates_service.apply_template(db, current_user.id, template_id, data.date)
