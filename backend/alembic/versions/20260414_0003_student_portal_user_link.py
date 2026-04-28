"""student portal user link

Revision ID: 20260414_0003
Revises: 20260413_0002
Create Date: 2026-04-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260414_0003"
down_revision: str | None = "20260413_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("students", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_students_user_id", "students", ["user_id"])
    op.create_foreign_key("fk_students_user_id_users", "students", "users", ["user_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_students_user_id_users", "students", type_="foreignkey")
    op.drop_constraint("uq_students_user_id", "students", type_="unique")
    op.drop_column("students", "user_id")
