from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.parent import ParentConnectionCodeRead, ParentStudentLinkRead
from app.schemas.passport import PassportCreate, PassportRead, PassportUpdate


class StudentBase(BaseModel):
    firstname: str = Field(min_length=1, max_length=100)
    lastname: str = Field(min_length=1, max_length=100)
    phone_number: str = Field(min_length=5, max_length=50)
    parent_phone_number: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    birth_date: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    group_id: int | None = None
    teacher_id: int | None = None
    registration_date: date | None = None
    is_active: bool = True
    comment: str | None = None
    trial_lesson_status: str | None = Field(default=None, max_length=50)


class StudentCreate(StudentBase):
    passport: PassportCreate | None = None
    password: str | None = Field(default=None, min_length=6)


class StudentUpdate(BaseModel):
    firstname: str | None = Field(default=None, min_length=1, max_length=100)
    lastname: str | None = Field(default=None, min_length=1, max_length=100)
    phone_number: str | None = Field(default=None, min_length=5, max_length=50)
    parent_phone_number: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    birth_date: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    group_id: int | None = None
    teacher_id: int | None = None
    registration_date: date | None = None
    is_active: bool | None = None
    comment: str | None = None
    trial_lesson_status: str | None = Field(default=None, max_length=50)
    passport: PassportUpdate | None = None


class StudentRead(StudentBase):
    id: int
    user_id: int | None = None
    created_at: datetime
    passport: PassportRead | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentListItem(BaseModel):
    id: int
    firstname: str
    lastname: str
    phone_number: str
    parent_phone_number: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    group_id: int | None = None
    user_id: int | None = None
    is_active: bool
    comment: str | None = None
    registration_date: date | None = None
    trial_lesson_status: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentApproveRequest(BaseModel):
    group_id: int | None = None
    generate_parent_code: bool = True
    relation_type: Literal["mother", "father", "guardian"] = "guardian"
    create_student_user: bool = False
    password: str | None = Field(default=None, min_length=6)
    email: EmailStr | None = None


class GroupSummaryRead(BaseModel):
    id: int
    name: str
    teacher_id: int | None = None
    teacher_name: str | None = None
    students_count: int = 0
    is_active: bool


class StudentApproveResponse(BaseModel):
    student: StudentRead
    group: GroupSummaryRead | None = None
    parent_connection_code: ParentConnectionCodeRead | None = None
    parent_links: list[ParentStudentLinkRead] = []
    parent_connected: bool = False
    application_status: str | None = None
    user_id: int | None = None
    email: EmailStr | None = None
    default_password: str | None = None
    account_warning: str | None = None


class StudentRejectRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ParentLinkStatusRead(BaseModel):
    student_id: int
    parent_connected: bool
    parent_links: list[ParentStudentLinkRead] = []
    active_code: ParentConnectionCodeRead | None = None


class StudentSummary(BaseModel):
    total_students: int
    assigned_students: int
    unassigned_students: int


class StudentRecentNote(BaseModel):
    source: Literal["student", "attendance", "homework"]
    title: str
    note: str
    created_at: datetime | None = None


class TeacherStudentProgressRead(BaseModel):
    student: StudentRead
    attendance_percent: float
    homework_percent: float
    attendance_total: int
    homework_total: int
    recent_notes: list[StudentRecentNote] = []
    can_notify_parent: bool = False
