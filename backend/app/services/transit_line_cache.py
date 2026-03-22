from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transit_line import TransitLine

logger = logging.getLogger(__name__)

# Module-level cache: name_ja -> {transit_line_id, route_color}
_cache: dict[str, dict[str, int | str | None]] = {}
_loaded: bool = False


async def _load_cache(db: AsyncSession) -> None:
    global _cache, _loaded
    result = await db.execute(select(TransitLine))
    lines = result.scalars().all()
    _cache = {
        line.name_ja: {"transit_line_id": line.id, "route_color": line.color}
        for line in lines
    }
    _loaded = True
    logger.info("Transit line cache loaded: %d entries", len(_cache))


_NO_MATCH: dict[str, int | str | None] = {"transit_line_id": None, "route_color": None}


async def lookup(db: AsyncSession, name_ja: str | None) -> dict[str, int | str | None]:
    """Return {"transit_line_id": int|None, "route_color": str|None}."""
    global _loaded
    if not _loaded:
        await _load_cache(db)
    if name_ja is None:
        return _NO_MATCH
    return _cache.get(name_ja, _NO_MATCH)


def invalidate() -> None:
    """Reset cache so next lookup reloads from DB."""
    global _cache, _loaded
    _cache = {}
    _loaded = False
