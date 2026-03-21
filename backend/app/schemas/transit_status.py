from pydantic import BaseModel


class TransitLineInfo(BaseModel):
    mode: str
    route_short_name: str | None = None
    route_long_name: str | None = None
    agency_name: str | None = None


class TransitStatusResponse(BaseModel):
    schedule_list_id: int
    lines: list[TransitLineInfo]
    status_text: str
