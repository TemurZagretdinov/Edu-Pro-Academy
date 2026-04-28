from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HomeworkBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str | None = None
    group_id: int
    teacher_id: int | None = None
    due_date: date | None = None
    is_active: bool = True


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    due_date: date | None = None
    is_active: bool | None = None


class HomeworkRead(HomeworkBase):
    id: int
    teacher_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HomeworkStatusBase(BaseModel):
    homework_id: int
    student_id: int
    is_completed: bool = False
    submitted_at: datetime | None = None
    note: str | None = None


class HomeworkStatusUpsert(HomeworkStatusBase):
    pass


class HomeworkStatusRead(HomeworkStatusBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
