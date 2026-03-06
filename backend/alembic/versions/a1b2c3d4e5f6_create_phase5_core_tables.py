"""create phase5 core tables

Revision ID: a1b2c3d4e5f6
Revises: 713f37f71e12
Create Date: 2026-03-06 20:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "713f37f71e12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tags (global, seeded)
    op.create_table(
        "tags",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Template categories (global, seeded)
    op.create_table(
        "template_categories",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Schedule lists
    op.create_table(
        "schedule_lists",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Schedules
    op.create_table(
        "schedules",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("schedule_list_id", sa.BigInteger(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("destination_name", sa.String(length=255), nullable=True),
        sa.Column("destination_address", sa.String(length=255), nullable=True),
        sa.Column("destination_lat", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("destination_lon", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("travel_mode", sa.String(length=20), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("recurrence_rule", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["schedule_list_id"], ["schedule_lists.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Schedule tags (junction)
    op.create_table(
        "schedule_tags",
        sa.Column("schedule_id", sa.BigInteger(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("schedule_id", "tag_id"),
    )

    # Templates
    op.create_table(
        "templates",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("template_category_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["template_category_id"], ["template_categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Template schedules
    op.create_table(
        "template_schedules",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("template_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("destination_name", sa.String(length=255), nullable=True),
        sa.Column("destination_address", sa.String(length=255), nullable=True),
        sa.Column("destination_lat", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("destination_lon", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("travel_mode", sa.String(length=20), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Template schedule tags (junction)
    op.create_table(
        "template_schedule_tags",
        sa.Column("template_schedule_id", sa.BigInteger(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["template_schedule_id"], ["template_schedules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("template_schedule_id", "tag_id"),
    )

    # Packing items
    op.create_table(
        "packing_items",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("schedule_list_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_checked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["schedule_list_id"], ["schedule_lists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Schedule routes
    op.create_table(
        "schedule_routes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("schedule_id", sa.BigInteger(), nullable=False),
        sa.Column("route_data", sa.Text(), nullable=False),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrival_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_id"),
    )

    # Seed tags
    op.execute("INSERT INTO tags (name) VALUES ('仕事'), ('会食'), ('デート'), ('運動')")

    # Seed template categories
    op.execute("INSERT INTO template_categories (name) VALUES ('仕事の日'), ('在宅勤務'), ('休日')")


def downgrade() -> None:
    op.drop_table("schedule_routes")
    op.drop_table("packing_items")
    op.drop_table("template_schedule_tags")
    op.drop_table("template_schedules")
    op.drop_table("templates")
    op.drop_table("schedule_tags")
    op.drop_table("schedules")
    op.drop_table("schedule_lists")
    op.drop_table("template_categories")
    op.drop_table("tags")
