from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

NotificationType = Literal["absent", "late", "bad_grade", "homework_missing", "payment_reminder", "announcement"]
RelationType = Literal["mother", "father", "guardian"]


class ParentCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    phone_number: str | None = Field(default=None, max_length=50)


class ParentRead(BaseModel):
    id: int
    full_name: str
    phone_number: str | None = None
    telegram_chat_id: str | None = None
    telegram_user_id: str | None = None
    is_connected: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParentStudentLinkCreate(BaseModel):
    parent_id: int
    relation_type: RelationType = "guardian"
    is_primary: bool = True


class ParentStudentLinkRead(BaseModel):
    id: int
    parent_id: int
    student_id: int
    relation_type: str
    is_primary: bool
    created_at: datetime
    parent: ParentRead | None = None

    model_config = ConfigDict(from_attributes=True)


class ParentConnectionCodeRead(BaseModel):
    student_id: int
    code: str
    relation_type: str
    expires_at: datetime | None = None
    is_used: bool


class NotificationRead(BaseModel):
    id: int
    student_id: int
    parent_id: int
    type: str
    title: str
    message: str
    is_sent: bool
    sent_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestNotificationRequest(BaseModel):
    student_id: int
    type: NotificationType = "announcement"
    title: str = Field(default="Test bildirishnoma", max_length=180)
    message: str | None = None
