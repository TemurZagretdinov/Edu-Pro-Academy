from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    course_name: str | None = Field(default=None, max_length=150)
    level: str | None = Field(default=None, max_length=80)
    start_date: date | None = None
    end_date: date | None = None
    lesson_days: str | None = Field(default=None, max_length=120)
    lesson_time: time | None = None
    room: str | None = Field(default=None, max_length=80)
    teacher_id: int | None = None
    is_active: bool = True


class GroupCreate(GroupBase):
    monthly_fee: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    course_name: str | None = Field(default=None, max_length=150)
    level: str | None = Field(default=None, max_length=80)
    start_date: date | None = None
    end_date: date | None = None
    lesson_days: str | None = Field(default=None, max_length=120)
    lesson_time: time | None = None
    room: str | None = Field(default=None, max_length=80)
    teacher_id: int | None = None
    is_active: bool | None = None
    monthly_fee: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)


class GroupTeacherInfo(BaseModel):
    id: int
    full_name: str


class GroupStudentInfo(BaseModel):
    id: int
    firstname: str
    lastname: str
    phone_number: str
    is_active: bool


class GroupRead(GroupBase):
    id: int
    created_at: datetime
    teacher: GroupTeacherInfo | None = None
    students_count: int = 0
    students: list[GroupStudentInfo] = Field(default_factory=list)
    monthly_fee: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class GroupAssignTeacherRequest(BaseModel):
    teacher_id: int = Field(gt=0)


class GroupStudentsRequest(BaseModel):
    student_ids: list[int] = Field(min_length=1)


class GroupTeacherRead(BaseModel):
    id: int
    teacher_id: int
    group_id: int

    model_config = ConfigDict(from_attributes=True)
