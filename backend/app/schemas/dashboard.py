from decimal import Decimal

from pydantic import BaseModel

from app.schemas.attendance import AttendanceSummary
from app.schemas.payment import PaymentRead


class DashboardStats(BaseModel):
    total_students: int
    total_active_students: int
    active_students: int
    total_teachers: int
    total_groups: int
    active_groups: int
    today_attendance: int
    total_monthly_revenue: Decimal
    paid_on_time_students: int
    on_time_payers: int
    overdue_students: int
    homework_completion_percent: float
    homework_completion_rate: float
    recent_payments: list[PaymentRead]
    attendance_summary: list[AttendanceSummary]


class TeacherDashboardStats(BaseModel):
    own_groups: int
    total_students: int
    todays_lessons: int
    today_attendance_summary: list[AttendanceSummary]
    homework_completion_percent: float
    recent_activity: list[str]
