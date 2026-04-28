from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentBase(BaseModel):
    student_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    is_cash: bool = True
    time_id: int | None = None
    paid_for_month: date | None = None
    payment_date: date | None = None
    status: str = Field(default="paid", max_length=30)
    note: str | None = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    is_cash: bool | None = None
    time_id: int | None = None
    paid_for_month: date | None = None
    payment_date: date | None = None
    status: str | None = Field(default=None, max_length=30)
    note: str | None = None


class PaymentRead(PaymentBase):
    id: int
    payment_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MonthlyPaymentSummary(BaseModel):
    month: datetime
    total_amount: Decimal
    payment_count: int
