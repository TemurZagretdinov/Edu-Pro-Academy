"""group schedules

Revision ID: 20260415_0004
Revises: 20260414_0003
Create Date: 2026-04-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260415_0004"
down_revision: str | None = "20260414_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "group_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.String(length=30), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("subject_name", sa.String(length=180), nullable=False),
        sa.Column("room", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_group_schedules_group_id"), "group_schedules", ["group_id"], unique=False)
    op.create_index(op.f("ix_group_schedules_id"), "group_schedules", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_group_schedules_id"), table_name="group_schedules")
    op.drop_index(op.f("ix_group_schedules_group_id"), table_name="group_schedules")
    op.drop_table("group_schedules")
