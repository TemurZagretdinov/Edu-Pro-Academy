from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.time_month import TimeMonthTable


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    is_cash: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    time_id: Mapped[int | None] = mapped_column(ForeignKey("time_months.id", ondelete="SET NULL"), nullable=True)
    paid_for_month: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    status: Mapped[str] = mapped_column(String(30), default="paid", server_default="paid")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship(back_populates="payments")
    time_month: Mapped["TimeMonthTable | None"] = relationship(back_populates="payments")
