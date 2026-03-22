"""create transit_lines table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-22 22:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transit_lines",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("line_key", sa.String(100), nullable=False),
        sa.Column("name_ja", sa.String(100), nullable=False),
        sa.Column("name_en", sa.String(200), nullable=True),
        sa.Column("color", sa.String(10), nullable=False),
        sa.Column("operator", sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("line_key"),
    )
    op.create_index("ix_transit_lines_name_ja", "transit_lines", ["name_ja"])


def downgrade() -> None:
    op.drop_index("ix_transit_lines_name_ja", table_name="transit_lines")
    op.drop_table("transit_lines")
