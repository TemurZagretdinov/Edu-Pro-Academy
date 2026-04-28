"""auth registration homework phase

Revision ID: 20260413_0002
Revises: 20260413_0001
Create Date: 2026-04-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260413_0002"
down_revision: str | None = "20260413_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("passports", sa.Column("passport_number", sa.String(length=30), nullable=True))
    op.add_column("passports", sa.Column("issued_by", sa.String(length=180), nullable=True))
    op.add_column("passports", sa.Column("notes", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_passports_passport_number", "passports", ["passport_number"])

    op.add_column("groups", sa.Column("course_name", sa.String(length=150), nullable=True))
    op.add_column("groups", sa.Column("level", sa.String(length=80), nullable=True))
    op.add_column("groups", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("groups", sa.Column("end_date", sa.Date(), nullable=True))
    op.add_column("groups", sa.Column("lesson_days", sa.String(length=120), nullable=True))
    op.add_column("groups", sa.Column("lesson_time", sa.Time(), nullable=True))
    op.add_column("groups", sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_groups_teacher_id_teachers", "groups", "teachers", ["teacher_id"], ["id"], ondelete="SET NULL")

    op.alter_column("students", "email", existing_type=sa.String(length=255), nullable=True)
    op.add_column("students", sa.Column("parent_phone_number", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("students", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column("students", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("students", sa.Column("registration_date", sa.Date(), nullable=True))
    op.add_column("students", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("students", sa.Column("comment", sa.Text(), nullable=True))
    op.add_column("students", sa.Column("trial_lesson_status", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_students_teacher_id_teachers", "students", "teachers", ["teacher_id"], ["id"], ondelete="SET NULL")

    op.add_column("payments", sa.Column("paid_for_month", sa.Date(), nullable=True))
    op.add_column("payments", sa.Column("payment_date", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False))
    op.add_column("payments", sa.Column("status", sa.String(length=30), server_default="paid", nullable=False))
    op.add_column("payments", sa.Column("note", sa.Text(), nullable=True))

    op.alter_column("attendance", "lesson_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("attendance", sa.Column("group_id", sa.Integer(), nullable=True))
    op.add_column("attendance", sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.add_column("attendance", sa.Column("date", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False))
    op.add_column("attendance", sa.Column("note", sa.Text(), nullable=True))
    op.create_foreign_key("fk_attendance_group_id_groups", "attendance", "groups", ["group_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_attendance_teacher_id_teachers", "attendance", "teachers", ["teacher_id"], ["id"], ondelete="SET NULL")
    op.create_unique_constraint("uq_attendance_student_group_date", "attendance", ["student_id", "group_id", "date"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "homework",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_homework_id"), "homework", ["id"], unique=False)

    op.create_table(
        "homework_statuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("homework_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["homework_id"], ["homework.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("homework_id", "student_id", name="uq_homework_student_status"),
    )
    op.create_index(op.f("ix_homework_statuses_id"), "homework_statuses", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_homework_statuses_id"), table_name="homework_statuses")
    op.drop_table("homework_statuses")
    op.drop_index(op.f("ix_homework_id"), table_name="homework")
    op.drop_table("homework")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    op.drop_constraint("uq_attendance_student_group_date", "attendance", type_="unique")
    op.drop_constraint("fk_attendance_teacher_id_teachers", "attendance", type_="foreignkey")
    op.drop_constraint("fk_attendance_group_id_groups", "attendance", type_="foreignkey")
    op.drop_column("attendance", "note")
    op.drop_column("attendance", "date")
    op.drop_column("attendance", "teacher_id")
    op.drop_column("attendance", "group_id")
    op.alter_column("attendance", "lesson_id", existing_type=sa.Integer(), nullable=False)

    op.drop_column("payments", "note")
    op.drop_column("payments", "status")
    op.drop_column("payments", "payment_date")
    op.drop_column("payments", "paid_for_month")

    op.drop_constraint("fk_students_teacher_id_teachers", "students", type_="foreignkey")
    op.drop_column("students", "teacher_id")
    op.drop_column("students", "trial_lesson_status")
    op.drop_column("students", "comment")
    op.drop_column("students", "is_active")
    op.drop_column("students", "registration_date")
    op.drop_column("students", "address")
    op.drop_column("students", "gender")
    op.drop_column("students", "birth_date")
    op.drop_column("students", "parent_phone_number")
    op.alter_column("students", "email", existing_type=sa.String(length=255), nullable=False)

    op.drop_constraint("fk_groups_teacher_id_teachers", "groups", type_="foreignkey")
    op.drop_column("groups", "teacher_id")
    op.drop_column("groups", "lesson_time")
    op.drop_column("groups", "lesson_days")
    op.drop_column("groups", "end_date")
    op.drop_column("groups", "start_date")
    op.drop_column("groups", "level")
    op.drop_column("groups", "course_name")

    op.drop_constraint("uq_passports_passport_number", "passports", type_="unique")
    op.drop_column("passports", "notes")
    op.drop_column("passports", "issued_by")
    op.drop_column("passports", "passport_number")
