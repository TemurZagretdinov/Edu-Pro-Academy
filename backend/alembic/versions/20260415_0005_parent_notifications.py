"""parent telegram notifications

Revision ID: 20260415_0005
Revises: 20260415_0004
Create Date: 2026-04-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260415_0005"
down_revision: str | None = "20260415_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "parents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=True),
        sa.Column("telegram_chat_id", sa.String(length=80), nullable=True),
        sa.Column("telegram_user_id", sa.String(length=80), nullable=True),
        sa.Column("is_connected", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_parents_id"), "parents", ["id"], unique=False)
    op.create_index(op.f("ix_parents_phone_number"), "parents", ["phone_number"], unique=False)
    op.create_index(op.f("ix_parents_telegram_chat_id"), "parents", ["telegram_chat_id"], unique=True)
    op.create_index(op.f("ix_parents_telegram_user_id"), "parents", ["telegram_user_id"], unique=True)

    op.create_table(
        "parent_connection_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("relation_type", sa.String(length=30), server_default="guardian", nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_used", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_parent_connection_codes_code"), "parent_connection_codes", ["code"], unique=True)
    op.create_index(op.f("ix_parent_connection_codes_id"), "parent_connection_codes", ["id"], unique=False)
    op.create_index(op.f("ix_parent_connection_codes_student_id"), "parent_connection_codes", ["student_id"], unique=False)

    op.create_table(
        "parent_student_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(length=30), server_default="guardian", nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["parents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_id", "student_id", name="uq_parent_student_link"),
    )
    op.create_index(op.f("ix_parent_student_links_id"), "parent_student_links", ["id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_sent", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["parents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_parent_id"), "notifications", ["parent_id"], unique=False)
    op.create_index(op.f("ix_notifications_student_id"), "notifications", ["student_id"], unique=False)
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_student_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_parent_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_parent_student_links_id"), table_name="parent_student_links")
    op.drop_table("parent_student_links")
    op.drop_index(op.f("ix_parent_connection_codes_student_id"), table_name="parent_connection_codes")
    op.drop_index(op.f("ix_parent_connection_codes_id"), table_name="parent_connection_codes")
    op.drop_index(op.f("ix_parent_connection_codes_code"), table_name="parent_connection_codes")
    op.drop_table("parent_connection_codes")
    op.drop_index(op.f("ix_parents_telegram_user_id"), table_name="parents")
    op.drop_index(op.f("ix_parents_telegram_chat_id"), table_name="parents")
    op.drop_index(op.f("ix_parents_phone_number"), table_name="parents")
    op.drop_index(op.f("ix_parents_id"), table_name="parents")
    op.drop_table("parents")
