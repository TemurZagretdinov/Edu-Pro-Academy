from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.group import Group
    from app.models.lesson_time import LessonTimeTable
    from app.models.payment import Payment


class TimeMonthTable(Base):
    __tablename__ = "time_months"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))

    group: Mapped["Group"] = relationship(back_populates="time_months")
    lessons: Mapped[list["LessonTimeTable"]] = relationship(back_populates="time_month")
    payments: Mapped[list["Payment"]] = relationship(back_populates="time_month")
