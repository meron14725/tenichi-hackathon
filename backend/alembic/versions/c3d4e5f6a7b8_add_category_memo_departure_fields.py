"""add category, memo, departure fields to schedule_lists and templates

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-20 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename template_categories -> categories
    op.rename_table("template_categories", "categories")

    # 2. Update seed data: delete old, insert new
    op.execute("DELETE FROM categories")
    op.execute("INSERT INTO categories (name) VALUES ('休日'), ('旅行'), ('仕事'), ('出張')")

    # 3. Rename templates.template_category_id -> category_id
    # Drop old FK first, then rename column, then add new FK
    op.drop_constraint("templates_template_category_id_fkey", "templates", type_="foreignkey")
    op.alter_column("templates", "template_category_id", new_column_name="category_id")
    op.create_foreign_key(
        "templates_category_id_fkey", "templates", "categories", ["category_id"], ["id"], ondelete="SET NULL"
    )

    # 4. Add new columns to templates
    op.add_column("templates", sa.Column("memo", sa.String(length=500), nullable=True))
    op.add_column("templates", sa.Column("departure_name", sa.String(length=255), nullable=True))
    op.add_column("templates", sa.Column("departure_lat", sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column("templates", sa.Column("departure_lng", sa.Numeric(precision=9, scale=6), nullable=True))

    # 5. Add new columns to schedule_lists
    op.add_column("schedule_lists", sa.Column("category_id", sa.BigInteger(), nullable=True))
    op.add_column("schedule_lists", sa.Column("memo", sa.String(length=500), nullable=True))
    op.add_column("schedule_lists", sa.Column("departure_name", sa.String(length=255), nullable=True))
    op.add_column("schedule_lists", sa.Column("departure_lat", sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column("schedule_lists", sa.Column("departure_lng", sa.Numeric(precision=9, scale=6), nullable=True))
    op.create_foreign_key(
        "schedule_lists_category_id_fkey",
        "schedule_lists",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # 1. schedule_lists: drop FK and new columns
    op.drop_constraint("schedule_lists_category_id_fkey", "schedule_lists", type_="foreignkey")
    op.drop_column("schedule_lists", "departure_lng")
    op.drop_column("schedule_lists", "departure_lat")
    op.drop_column("schedule_lists", "departure_name")
    op.drop_column("schedule_lists", "memo")
    op.drop_column("schedule_lists", "category_id")

    # 2. templates: drop new columns
    op.drop_column("templates", "departure_lng")
    op.drop_column("templates", "departure_lat")
    op.drop_column("templates", "departure_name")
    op.drop_column("templates", "memo")

    # 3. templates: drop FK, rename column back
    op.drop_constraint("templates_category_id_fkey", "templates", type_="foreignkey")
    op.alter_column("templates", "category_id", new_column_name="template_category_id")

    # 4. Rename table back
    op.rename_table("categories", "template_categories")

    # 5. Recreate FK pointing at restored table name
    op.create_foreign_key(
        "templates_template_category_id_fkey",
        "templates",
        "template_categories",
        ["template_category_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 6. Restore seed data
    op.execute("DELETE FROM template_categories")
    op.execute("INSERT INTO template_categories (name) VALUES ('仕事の日'), ('在宅勤務'), ('休日')")
