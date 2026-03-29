"""rebuild suggestion_caches as per-user table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-28 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("suggestion_caches")
    op.create_table(
        "suggestion_caches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("suggestion_text", sa.Text(), nullable=False),
        sa.Column("weather_summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "target_date"),
    )


def downgrade() -> None:
    op.drop_table("suggestion_caches")
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
