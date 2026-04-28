from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import extract, func, or_, select

from app.api.deps import AdminUser, SessionDep, TeacherUser
from app.models.attendance import AttendanceTable
from app.models.group import Group, GroupTeacher
from app.models.homework import HomeworkStatus
from app.models.lesson_time import LessonTimeTable
from app.models.payment import Payment
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.attendance import AttendanceSummary
from app.schemas.dashboard import DashboardStats, TeacherDashboardStats

router = APIRouter()


def _admin_dashboard(db: SessionDep) -> DashboardStats:
    now = datetime.now(timezone.utc)
    today = date.today()
    first_of_month = today.replace(day=1)
    total_students = db.scalar(select(func.count(Student.id))) or 0
    total_active_students = db.scalar(select(func.count(Student.id)).where(Student.is_active.is_(True))) or 0
    total_teachers = db.scalar(select(func.count(Teacher.id))) or 0
    total_groups = db.scalar(select(func.count(Group.id))) or 0
    active_groups = db.scalar(select(func.count(Group.id)).where(Group.is_active.is_(True))) or 0
    total_monthly_revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            extract("year", Payment.created_at) == now.year,
            extract("month", Payment.created_at) == now.month,
        )
    ) or Decimal("0")
    paid_student_ids = (
        select(Payment.student_id.label("student_id"))
        .where(
            or_(Payment.paid_for_month == first_of_month, Payment.payment_date >= first_of_month),
            Payment.status == "paid",
        )
        .distinct()
        .subquery()
    )
    paid_on_time_students = db.scalar(select(func.count()).select_from(paid_student_ids)) or 0
    overdue_students = db.scalar(
        select(func.count(Student.id)).where(
            Student.is_active.is_(True),
            Student.id.not_in(select(paid_student_ids.c.student_id)),
        )
    ) or 0
    homework_total = db.scalar(select(func.count(HomeworkStatus.id))) or 0
    homework_completed = db.scalar(select(func.count(HomeworkStatus.id)).where(HomeworkStatus.is_completed.is_(True))) or 0
    homework_completion_percent = round((homework_completed / homework_total) * 100, 1) if homework_total else 0.0
    recent_payments = list(db.scalars(select(Payment).order_by(Payment.created_at.desc()).limit(8)))
    attendance_rows = db.execute(
        select(AttendanceTable.status, func.count(AttendanceTable.id))
        .where(AttendanceTable.date == today)
        .group_by(AttendanceTable.status)
        .order_by(AttendanceTable.status)
    ).all()

    return DashboardStats(
        total_students=total_students,
        total_active_students=total_active_students,
        active_students=total_active_students,
        total_teachers=total_teachers,
        total_groups=total_groups,
        active_groups=active_groups,
        today_attendance=sum(row[1] for row in attendance_rows),
        total_monthly_revenue=total_monthly_revenue,
        paid_on_time_students=paid_on_time_students,
        on_time_payers=paid_on_time_students,
        overdue_students=overdue_students,
        homework_completion_percent=homework_completion_percent,
        homework_completion_rate=homework_completion_percent,
        recent_payments=recent_payments,
        attendance_summary=[AttendanceSummary(status=row[0], count=row[1]) for row in attendance_rows],
    )


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: SessionDep, _admin: AdminUser) -> DashboardStats:
    return _admin_dashboard(db)


@router.get("/admin", response_model=DashboardStats)
def get_admin_dashboard(db: SessionDep, _admin: AdminUser) -> DashboardStats:
    return _admin_dashboard(db)


@router.get("/teacher", response_model=TeacherDashboardStats)
def get_teacher_dashboard(db: SessionDep, current_user: TeacherUser) -> TeacherDashboardStats:
    teacher_id = current_user.teacher_id
    today = date.today()
    group_ids = list(
        db.scalars(
            select(Group.id)
            .outerjoin(GroupTeacher, GroupTeacher.group_id == Group.id)
            .where(or_(Group.teacher_id == teacher_id, GroupTeacher.teacher_id == teacher_id))
            .distinct()
        )
    )
    own_groups = len(group_ids)
    total_students = 0
    todays_lessons = 0
    attendance_rows: list[tuple[str, int]] = []
    homework_completion_percent = 0.0
    recent_activity: list[str] = []

    if group_ids:
        total_students = db.scalar(select(func.count(Student.id)).where(Student.group_id.in_(group_ids), Student.is_active.is_(True))) or 0
        todays_lessons = db.scalar(
            select(func.count(LessonTimeTable.id)).where(
                LessonTimeTable.group_id.in_(group_ids),
                func.date(LessonTimeTable.datetime) == today,
            )
        ) or 0
        attendance_rows = db.execute(
            select(AttendanceTable.status, func.count(AttendanceTable.id))
            .where(AttendanceTable.group_id.in_(group_ids), AttendanceTable.date == today)
            .group_by(AttendanceTable.status)
            .order_by(AttendanceTable.status)
        ).all()
        homework_total = (
            db.scalar(
                select(func.count(HomeworkStatus.id))
                .join(Student, Student.id == HomeworkStatus.student_id)
                .where(Student.group_id.in_(group_ids))
            )
            or 0
        )
        homework_completed = (
            db.scalar(
                select(func.count(HomeworkStatus.id))
                .join(Student, Student.id == HomeworkStatus.student_id)
                .where(Student.group_id.in_(group_ids), HomeworkStatus.is_completed.is_(True))
            )
            or 0
        )
        homework_completion_percent = round((homework_completed / homework_total) * 100, 1) if homework_total else 0.0
        recent_attendance = db.execute(
            select(Student.firstname, Student.lastname, AttendanceTable.status)
            .join(Student, Student.id == AttendanceTable.student_id)
            .where(Student.group_id.in_(group_ids))
            .order_by(AttendanceTable.created_at.desc())
            .limit(5)
        ).all()
        recent_activity = [f"{row[0]} {row[1]}: davomat {row[2]}" for row in recent_attendance]

    return TeacherDashboardStats(
        own_groups=own_groups,
        total_students=total_students,
        todays_lessons=todays_lessons,
        today_attendance_summary=[AttendanceSummary(status=row[0], count=row[1]) for row in attendance_rows],
        homework_completion_percent=homework_completion_percent,
        recent_activity=recent_activity,
    )
