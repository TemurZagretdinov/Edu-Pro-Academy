from datetime import datetime as DateTime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.attendance import AttendanceStatus


class LessonTimeBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    time_id: int | None = None
    group_id: int | None = None
    datetime: DateTime
    is_accepted: bool = False


class LessonTimeCreate(LessonTimeBase):
    pass


class LessonTimeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    time_id: int | None = None
    group_id: int | None = None
    datetime: DateTime | None = None
    is_accepted: bool | None = None


class LessonTimeRead(LessonTimeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class LessonJournalStudent(BaseModel):
    id: int
    firstname: str
    lastname: str
    phone_number: str
    is_active: bool


class LessonJournalRow(BaseModel):
    student: LessonJournalStudent
    attendance_id: int | None = None
    status: AttendanceStatus | None = None
    grade: int | None = Field(default=None, ge=0, le=100)
    note: str | None = None
    saved: bool = False


class LessonJournalSaveItem(BaseModel):
    student_id: int
    status: AttendanceStatus
    grade: int | None = Field(default=None, ge=0, le=100)
    note: str | None = None


class LessonJournalBatchSave(BaseModel):
    rows: list[LessonJournalSaveItem] = Field(min_length=1)
