"""teacher profile fields

Revision ID: 20260420_0007
Revises: 20260415_0006
Create Date: 2026-04-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260420_0007"
down_revision: str | None = "20260415_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("teachers", sa.Column("direction", sa.String(length=150), nullable=True))
    op.add_column("teachers", sa.Column("hire_date", sa.Date(), nullable=True))
    op.add_column("teachers", sa.Column("bio", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("teachers", "bio")
    op.drop_column("teachers", "hire_date")
    op.drop_column("teachers", "direction")
