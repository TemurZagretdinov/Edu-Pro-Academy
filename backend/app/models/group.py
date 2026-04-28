from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.lesson_time import LessonTimeTable
    from app.models.group_schedule import GroupSchedule
    from app.models.homework import Homework
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.time_month import TimeMonthTable


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    course_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    level: Mapped[str | None] = mapped_column(String(80), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lesson_days: Mapped[str | None] = mapped_column(String(120), nullable=True)
    lesson_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    room: Mapped[str | None] = mapped_column(String(80), nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    students: Mapped[list["Student"]] = relationship(back_populates="group")
    teacher: Mapped["Teacher | None"] = relationship(back_populates="groups")
    teacher_links: Mapped[list["GroupTeacher"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    time_months: Mapped[list["TimeMonthTable"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    lessons: Mapped[list["LessonTimeTable"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    schedules: Mapped[list["GroupSchedule"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    homework_items: Mapped[list["Homework"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class GroupTeacher(Base):
    __tablename__ = "group_teachers"
    __table_args__ = (UniqueConstraint("teacher_id", "group_id", name="uq_group_teacher_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))

    teacher: Mapped["Teacher"] = relationship(back_populates="group_links")
    group: Mapped["Group"] = relationship(back_populates="teacher_links")
