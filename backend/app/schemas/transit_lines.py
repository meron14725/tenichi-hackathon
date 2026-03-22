from pydantic import BaseModel


class TransitLineResponse(BaseModel):
    id: int
    line_key: str
    name_ja: str
    name_en: str | None = None
    color: str
    operator: str | None = None

    model_config = {"from_attributes": True}
