from datetime import datetime as DateTime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TimeMonthBase(BaseModel):
    datetime: DateTime
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    group_id: int


class TimeMonthCreate(TimeMonthBase):
    pass


class TimeMonthUpdate(BaseModel):
    datetime: DateTime | None = None
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    group_id: int | None = None


class TimeMonthRead(TimeMonthBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
