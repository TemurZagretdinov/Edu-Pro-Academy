from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.group import Group
    from app.models.student import Student
    from app.models.teacher import Teacher


class Homework(Base):
    __tablename__ = "homework"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    teacher: Mapped["Teacher"] = relationship(back_populates="homework_items")
    group: Mapped["Group"] = relationship(back_populates="homework_items")
    statuses: Mapped[list["HomeworkStatus"]] = relationship(
        back_populates="homework",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class HomeworkStatus(Base):
    __tablename__ = "homework_statuses"
    __table_args__ = (UniqueConstraint("homework_id", "student_id", name="uq_homework_student_status"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    homework_id: Mapped[int] = mapped_column(ForeignKey("homework.id", ondelete="CASCADE"))
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    homework: Mapped["Homework"] = relationship(back_populates="statuses")
    student: Mapped["Student"] = relationship(back_populates="homework_statuses")
