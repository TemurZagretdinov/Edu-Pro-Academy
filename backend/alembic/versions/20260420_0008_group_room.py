"""group room

Revision ID: 20260420_0008
Revises: 20260420_0007
Create Date: 2026-04-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260420_0008"
down_revision: str | None = "20260420_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("groups", sa.Column("room", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("groups", "room")
