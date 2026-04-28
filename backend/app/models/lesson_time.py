from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceTable
    from app.models.group import Group
    from app.models.time_month import TimeMonthTable


class LessonTimeTable(Base):
    __tablename__ = "lesson_times"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    time_id: Mapped[int | None] = mapped_column(ForeignKey("time_months.id", ondelete="SET NULL"), nullable=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    time_month: Mapped["TimeMonthTable | None"] = relationship(back_populates="lessons")
    group: Mapped["Group | None"] = relationship(back_populates="lessons")
    attendance_records: Mapped[list["AttendanceTable"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
