from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.lesson_time import LessonTimeTable
    from app.models.student import Student


class AttendanceTable(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_attendance_student_lesson"),
        UniqueConstraint("student_id", "group_id", "date", name="uq_attendance_student_group_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lesson_times.id", ondelete="CASCADE"), nullable=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    status: Mapped[str] = mapped_column(String(30))
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship(back_populates="attendance_records")
    lesson: Mapped["LessonTimeTable"] = relationship(back_populates="attendance_records")
