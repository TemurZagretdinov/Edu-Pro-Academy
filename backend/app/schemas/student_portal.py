from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.attendance import AttendanceRead
from app.schemas.payment import PaymentRead


class StudentPortalProfile(BaseModel):
    id: int
    firstname: str
    lastname: str
    full_name: str
    phone_number: str
    parent_phone_number: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    group_id: int | None = None
    group_name: str | None = None
    teacher_id: int | None = None
    teacher_name: str | None = None
    is_active: bool
    created_at: datetime


class StudentAttendanceSummary(BaseModel):
    present: int = 0
    absent: int = 0
    late: int = 0


class StudentPaymentSummary(BaseModel):
    total_paid: Decimal = Decimal("0")
    current_debt: Decimal = Decimal("0")
    monthly_fee: Decimal = Decimal("0")
    last_payment_date: date | None = None


class StudentScheduleItem(BaseModel):
    id: int
    day_of_week: str
    start_time: time
    end_time: time
    subject_name: str
    room: str | None = None
    teacher_name: str | None = None


class StudentHomeworkSummary(BaseModel):
    total: int = 0
    completed: int = 0
    pending: int = 0


class StudentDashboardRead(BaseModel):
    student_name: str
    group_name: str | None = None
    teacher_name: str | None = None
    attendance_summary: StudentAttendanceSummary
    payment_summary: StudentPaymentSummary
    homework_summary: StudentHomeworkSummary
    next_lessons: list[StudentScheduleItem] = []


class StudentHomeworkPortalItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    due_date: date | None = None
    group_id: int
    teacher_id: int
    is_completed: bool = False
    submitted_at: datetime | None = None
    note: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentPortalPaymentsRead(BaseModel):
    summary: StudentPaymentSummary
    items: list[PaymentRead]


class StudentPortalAttendanceRead(BaseModel):
    summary: StudentAttendanceSummary
    items: list[AttendanceRead]


class StudentPortalScheduleRead(BaseModel):
    items: list[StudentScheduleItem]
