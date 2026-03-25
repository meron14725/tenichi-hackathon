"""create weather_caches and suggestion_caches tables

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-25 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weather_caches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("prefecture_code", sa.String(2), nullable=False),
        sa.Column("prefecture_name", sa.String(10), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("temp_c", sa.Float(), nullable=False),
        sa.Column("condition", sa.String(100), nullable=False),
        sa.Column("condition_icon_url", sa.String(255), nullable=True),
        sa.Column("precip_mm", sa.Float(), nullable=False),
        sa.Column("chance_of_rain", sa.Integer(), nullable=False),
        sa.Column("humidity", sa.Integer(), nullable=False),
        sa.Column("wind_kph", sa.Float(), nullable=False),
        sa.Column("weather_severity", sa.Integer(), nullable=False),
        sa.Column("raw_response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prefecture_code", "target_date"),
    )

    op.create_table(
        "suggestion_caches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("prefecture_code", sa.String(2), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("suggestion_text", sa.Text(), nullable=False),
        sa.Column("weather_summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prefecture_code", "target_date"),
    )


def downgrade() -> None:
    op.drop_table("suggestion_caches")
    op.drop_table("weather_caches")
