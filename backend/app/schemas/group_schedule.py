from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class GroupScheduleBase(BaseModel):
    group_id: int
    day_of_week: str = Field(min_length=1, max_length=30)
    start_time: time
    end_time: time
    subject_name: str = Field(min_length=1, max_length=180)
    room: str | None = Field(default=None, max_length=80)


class GroupScheduleCreate(GroupScheduleBase):
    pass


class GroupScheduleRead(GroupScheduleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
