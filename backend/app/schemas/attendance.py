from datetime import date as Date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AttendanceStatus = Literal["present", "came", "absent", "late", "excused"]


class AttendanceBase(BaseModel):
    student_id: int
    lesson_id: int | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    date: Date | None = None
    status: AttendanceStatus
    grade: int | None = Field(default=None, ge=0, le=100)
    reason: str | None = None
    note: str | None = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceBatchItem(BaseModel):
    student_id: int
    status: AttendanceStatus
    grade: int | None = Field(default=None, ge=0, le=100)
    reason: str | None = None
    note: str | None = None


class AttendanceBatchUpsert(BaseModel):
    group_id: int
    lesson_id: int | None = None
    date: Date | None = None
    items: list[AttendanceBatchItem] = Field(min_length=1)


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus | None = None
    grade: int | None = Field(default=None, ge=0, le=100)
    reason: str | None = None
    note: str | None = None


class AttendanceRead(AttendanceBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceSummary(BaseModel):
    status: str
    count: int
