"""initial education center schema

Revision ID: 20260413_0001
Revises:
Create Date: 2026-04-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260413_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_groups_id"), "groups", ["id"], unique=False)
    op.create_index(op.f("ix_groups_name"), "groups", ["name"], unique=True)

    op.create_table(
        "teachers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teachers_email"), "teachers", ["email"], unique=True)
    op.create_index(op.f("ix_teachers_id"), "teachers", ["id"], unique=False)
    op.create_index(op.f("ix_teachers_phone_number"), "teachers", ["phone_number"], unique=True)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("firstname", sa.String(length=100), nullable=False),
        sa.Column("lastname", sa.String(length=100), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_students_email"), "students", ["email"], unique=True)
    op.create_index(op.f("ix_students_id"), "students", ["id"], unique=False)
    op.create_index(op.f("ix_students_phone_number"), "students", ["phone_number"], unique=True)

    op.create_table(
        "group_teachers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("teacher_id", "group_id", name="uq_group_teacher_pair"),
    )
    op.create_index(op.f("ix_group_teachers_id"), "group_teachers", ["id"], unique=False)

    op.create_table(
        "passports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("firstname", sa.String(length=100), nullable=False),
        sa.Column("lastname", sa.String(length=100), nullable=False),
        sa.Column("seria", sa.String(length=20), nullable=False),
        sa.Column("jshir", sa.String(length=20), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_passports_id"), "passports", ["id"], unique=False)
    op.create_index(op.f("ix_passports_jshir"), "passports", ["jshir"], unique=True)
    op.create_index(op.f("ix_passports_seria"), "passports", ["seria"], unique=True)

    op.create_table(
        "time_months",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_time_months_id"), "time_months", ["id"], unique=False)

    op.create_table(
        "lesson_times",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("time_id", sa.Integer(), nullable=True),
        sa.Column("group_id", sa.Integer(), nullable=True),
        sa.Column("datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_accepted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["time_id"], ["time_months.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lesson_times_id"), "lesson_times", ["id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("is_cash", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("time_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["time_id"], ["time_months.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_id"), "payments", ["id"], unique=False)

    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lesson_times.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "lesson_id", name="uq_attendance_student_lesson"),
    )
    op.create_index(op.f("ix_attendance_id"), "attendance", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attendance_id"), table_name="attendance")
    op.drop_table("attendance")
    op.drop_index(op.f("ix_payments_id"), table_name="payments")
    op.drop_table("payments")
    op.drop_index(op.f("ix_lesson_times_id"), table_name="lesson_times")
    op.drop_table("lesson_times")
    op.drop_index(op.f("ix_time_months_id"), table_name="time_months")
    op.drop_table("time_months")
    op.drop_index(op.f("ix_passports_seria"), table_name="passports")
    op.drop_index(op.f("ix_passports_jshir"), table_name="passports")
    op.drop_index(op.f("ix_passports_id"), table_name="passports")
    op.drop_table("passports")
    op.drop_index(op.f("ix_group_teachers_id"), table_name="group_teachers")
    op.drop_table("group_teachers")
    op.drop_index(op.f("ix_students_phone_number"), table_name="students")
    op.drop_index(op.f("ix_students_id"), table_name="students")
    op.drop_index(op.f("ix_students_email"), table_name="students")
    op.drop_table("students")
    op.drop_index(op.f("ix_teachers_phone_number"), table_name="teachers")
    op.drop_index(op.f("ix_teachers_id"), table_name="teachers")
    op.drop_index(op.f("ix_teachers_email"), table_name="teachers")
    op.drop_table("teachers")
    op.drop_index(op.f("ix_groups_name"), table_name="groups")
    op.drop_index(op.f("ix_groups_id"), table_name="groups")
    op.drop_table("groups")
