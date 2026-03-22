from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AppError
from app.models.schedule import Schedule
from app.models.schedule_route import ScheduleRoute
from app.models.user import UserSettings
from app.schemas.routes import DepartureTimeRequest, RouteSearchRequest, ScheduleRouteCreate
from app.services import otp2_client, transit_line_cache


async def _enrich_itineraries(db: AsyncSession, itineraries: list[dict]) -> None:
    """Enrich each leg with transit_line_id and route_color from cache."""
    for itinerary in itineraries:
        for leg in itinerary.get("legs", []):
            match = await transit_line_cache.lookup(db, leg.get("route_long_name"))
            leg["transit_line_id"] = match["transit_line_id"]
            leg["route_color"] = match["route_color"]


async def _get_user_settings(db: AsyncSession, user_id: int) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if settings is None:
        raise AppError("NOT_FOUND", "User settings not found", 404)
    return settings


async def _get_owned_schedule(db: AsyncSession, user_id: int, schedule_id: int) -> Schedule:
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id, Schedule.user_id == user_id))
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise AppError("NOT_FOUND", "Schedule not found", 404)
    return schedule


async def search_routes(db: AsyncSession, user_id: int, data: RouteSearchRequest) -> dict:
    origin_lat = data.origin_lat
    origin_lon = data.origin_lon

    if origin_lat is None or origin_lon is None:
        settings = await _get_user_settings(db, user_id)
        if settings.home_lat is None or settings.home_lon is None:
            raise AppError("HOME_LOCATION_NOT_SET", "Home location is not set in user settings", 400)
        origin_lat = float(settings.home_lat)
        origin_lon = float(settings.home_lon)

    arrival_time_str = data.arrival_time.isoformat() if data.arrival_time else None

    itineraries = await otp2_client.search_routes(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=data.destination_lat,
        dest_lon=data.destination_lon,
        travel_mode=data.travel_mode,
        arrival_time=arrival_time_str,
    )

    await _enrich_itineraries(db, itineraries)

    return {"itineraries": itineraries}


async def calculate_departure_time(db: AsyncSession, user_id: int, data: DepartureTimeRequest) -> dict:
    settings = await _get_user_settings(db, user_id)

    if settings.home_lat is None or settings.home_lon is None:
        raise AppError("HOME_LOCATION_NOT_SET", "Home location is not set in user settings", 400)

    itineraries = await otp2_client.search_routes(
        origin_lat=float(settings.home_lat),
        origin_lon=float(settings.home_lon),
        dest_lat=data.destination_lat,
        dest_lon=data.destination_lon,
        travel_mode=data.travel_mode,
        arrival_time=data.arrival_time.isoformat(),
    )

    await _enrich_itineraries(db, itineraries)

    from datetime import datetime

    first = itineraries[0]
    leave_home_at = datetime.fromisoformat(first["departure_time"])
    preparation_minutes = settings.preparation_minutes
    start_preparation_at = leave_home_at - timedelta(minutes=preparation_minutes)

    return {
        "leave_home_at": leave_home_at.isoformat(),
        "start_preparation_at": start_preparation_at.isoformat(),
        "preparation_minutes": preparation_minutes,
        "arrival_time": data.arrival_time.isoformat(),
        "itineraries": itineraries,
    }


async def save_route(db: AsyncSession, user_id: int, schedule_id: int, data: ScheduleRouteCreate) -> ScheduleRoute:
    await _get_owned_schedule(db, user_id, schedule_id)

    # 既存ルートがあれば削除
    result = await db.execute(select(ScheduleRoute).where(ScheduleRoute.schedule_id == schedule_id))
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    route = ScheduleRoute(
        schedule_id=schedule_id,
        route_data=json.dumps(data.route_data, ensure_ascii=False),
        departure_time=data.departure_time,
        arrival_time=data.arrival_time,
        duration_minutes=data.duration_minutes,
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return route


async def get_route(db: AsyncSession, user_id: int, schedule_id: int) -> ScheduleRoute:
    await _get_owned_schedule(db, user_id, schedule_id)

    result = await db.execute(select(ScheduleRoute).where(ScheduleRoute.schedule_id == schedule_id))
    route = result.scalar_one_or_none()
    if route is None:
        raise AppError("NOT_FOUND", "Route not found for this schedule", 404)

    return route


async def delete_route(db: AsyncSession, user_id: int, schedule_id: int) -> None:
    await _get_owned_schedule(db, user_id, schedule_id)

    result = await db.execute(select(ScheduleRoute).where(ScheduleRoute.schedule_id == schedule_id))
    route = result.scalar_one_or_none()
    if route is None:
        raise AppError("NOT_FOUND", "Route not found for this schedule", 404)

    await db.delete(route)
    await db.commit()
