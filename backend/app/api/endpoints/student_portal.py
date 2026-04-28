from datetime import date
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import SessionDep, StudentUser
from app.models.attendance import AttendanceTable
from app.models.group import Group
from app.models.group_schedule import GroupSchedule
from app.models.homework import Homework, HomeworkStatus
from app.models.payment import Payment
from app.models.teacher import Teacher
from app.models.time_month import TimeMonthTable
from app.schemas.attendance import AttendanceRead
from app.schemas.payment import PaymentRead
from app.schemas.student_portal import (
    StudentAttendanceSummary,
    StudentDashboardRead,
    StudentHomeworkPortalItem,
    StudentHomeworkSummary,
    StudentPaymentSummary,
    StudentPortalAttendanceRead,
    StudentPortalPaymentsRead,
    StudentPortalProfile,
    StudentPortalScheduleRead,
    StudentScheduleItem,
)

router = APIRouter()

PAYMENT_CREDIT_STATUSES = {"paid", "partial"}
WEEKDAY_ORDER = {
    "monday": 1,
    "dushanba": 1,
    "tuesday": 2,
    "seshanba": 2,
    "wednesday": 3,
    "chorshanba": 3,
    "payshanba": 4,
    "thursday": 4,
    "friday": 5,
    "juma": 5,
    "saturday": 6,
    "shanba": 6,
    "sunday": 7,
    "yakshanba": 7,
}


def _group_name(db: SessionDep, group_id: int | None) -> str | None:
    if group_id is None:
        return None
    group = db.get(Group, group_id)
    return group.name if group else None


def _teacher(db: SessionDep, teacher_id: int | None, group_id: int | None) -> Teacher | None:
    if teacher_id is not None:
        teacher = db.get(Teacher, teacher_id)
        if teacher:
            return teacher
    if group_id is not None:
        group = db.get(Group, group_id)
        if group and group.teacher_id:
            return db.get(Teacher, group.teacher_id)
    return None


def _attendance_summary(db: SessionDep, student_id: int) -> StudentAttendanceSummary:
    rows = db.execute(
        select(AttendanceTable.status, func.count(AttendanceTable.id))
        .where(AttendanceTable.student_id == student_id)
        .group_by(AttendanceTable.status)
    ).all()
    counts = {row[0]: row[1] for row in rows}
    return StudentAttendanceSummary(
        present=(counts.get("present", 0) + counts.get("came", 0)),
        absent=counts.get("absent", 0),
        late=counts.get("late", 0),
    )


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _months_inclusive(start: date, end: date) -> int:
    return (end.year - start.year) * 12 + end.month - start.month + 1


def _monthly_fee(db: SessionDep, group_id: int | None) -> Decimal:
    if group_id is None:
        return Decimal("0")
    price = db.scalar(
        select(TimeMonthTable.price)
        .where(TimeMonthTable.group_id == group_id)
        .order_by(TimeMonthTable.datetime.desc(), TimeMonthTable.id.desc())
        .limit(1)
    )
    return price or Decimal("0")


def _payment_month(payment: Payment) -> date:
    if payment.paid_for_month:
        return _month_start(payment.paid_for_month)
    return _month_start(payment.payment_date)


def _payment_summary(db: SessionDep, student_id: int, group_id: int | None) -> StudentPaymentSummary:
    monthly_fee = _monthly_fee(db, group_id)
    payments = list(db.scalars(select(Payment).where(Payment.student_id == student_id)))
    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.student_id == student_id,
            Payment.status.in_(PAYMENT_CREDIT_STATUSES),
        )
    ) or Decimal("0")
    last_payment_date = db.scalar(
        select(func.max(Payment.payment_date)).where(
            Payment.student_id == student_id,
            Payment.status.in_(PAYMENT_CREDIT_STATUSES),
        )
    )

    if monthly_fee <= 0:
        current_debt = Decimal("0")
    else:
        billable_months = [_payment_month(payment) for payment in payments if payment.paid_for_month or payment.payment_date]
        first_month = min(billable_months) if billable_months else _month_start(date.today())
        months_due = _months_inclusive(first_month, _month_start(date.today()))
        expected_total = monthly_fee * Decimal(months_due)
        current_debt = max(expected_total - total_paid, Decimal("0"))

    return StudentPaymentSummary(
        total_paid=total_paid,
        current_debt=current_debt,
        monthly_fee=monthly_fee,
        last_payment_date=last_payment_date,
    )


def _schedule_items(db: SessionDep, group_id: int | None, teacher_name: str | None) -> list[StudentScheduleItem]:
    if group_id is None:
        return []
    schedules = list(db.scalars(select(GroupSchedule).where(GroupSchedule.group_id == group_id)))
    schedules.sort(key=lambda item: (WEEKDAY_ORDER.get(item.day_of_week.strip().lower(), 99), item.start_time, item.id))
    return [
        StudentScheduleItem(
            id=item.id,
            day_of_week=item.day_of_week,
            start_time=item.start_time,
            end_time=item.end_time,
            subject_name=item.subject_name,
            room=item.room,
            teacher_name=teacher_name,
        )
        for item in schedules
    ]


def _homework_items(db: SessionDep, student_id: int, group_id: int | None) -> list[StudentHomeworkPortalItem]:
    if group_id is None:
        return []
    homeworks = list(db.scalars(select(Homework).where(Homework.group_id == group_id, Homework.is_active.is_(True)).order_by(Homework.created_at.desc())))
    statuses = {
        item.homework_id: item
        for item in db.scalars(select(HomeworkStatus).where(HomeworkStatus.student_id == student_id)).all()
    }
    return [
        StudentHomeworkPortalItem(
            id=homework.id,
            title=homework.title,
            description=homework.description,
            due_date=homework.due_date,
            group_id=homework.group_id,
            teacher_id=homework.teacher_id,
            is_completed=statuses.get(homework.id).is_completed if statuses.get(homework.id) else False,
            submitted_at=statuses.get(homework.id).submitted_at if statuses.get(homework.id) else None,
            note=statuses.get(homework.id).note if statuses.get(homework.id) else None,
        )
        for homework in homeworks
    ]


def _homework_summary(items: list[StudentHomeworkPortalItem]) -> StudentHomeworkSummary:
    completed = sum(1 for item in items if item.is_completed)
    total = len(items)
    return StudentHomeworkSummary(total=total, completed=completed, pending=total - completed)


def _profile(db: SessionDep, student: StudentUser) -> StudentPortalProfile:
    teacher = _teacher(db, student.teacher_id, student.group_id)
    return StudentPortalProfile(
        id=student.id,
        firstname=student.firstname,
        lastname=student.lastname,
        full_name=f"{student.firstname} {student.lastname}",
        phone_number=student.phone_number,
        parent_phone_number=student.parent_phone_number,
        email=student.email,
        address=student.address,
        birth_date=student.birth_date,
        gender=student.gender,
        group_id=student.group_id,
        group_name=_group_name(db, student.group_id),
        teacher_id=teacher.id if teacher else None,
        teacher_name=teacher.name if teacher else None,
        is_active=student.is_active,
        created_at=student.created_at,
    )


@router.get("/dashboard", response_model=StudentDashboardRead)
def dashboard(db: SessionDep, student: StudentUser) -> StudentDashboardRead:
    homework_items = _homework_items(db, student.id, student.group_id)
    profile = _profile(db, student)
    schedule_items = _schedule_items(db, student.group_id, profile.teacher_name)
    return StudentDashboardRead(
        student_name=profile.full_name,
        group_name=profile.group_name,
        teacher_name=profile.teacher_name,
        attendance_summary=_attendance_summary(db, student.id),
        payment_summary=_payment_summary(db, student.id, student.group_id),
        homework_summary=_homework_summary(homework_items),
        next_lessons=schedule_items[:3],
    )


@router.get("/profile", response_model=StudentPortalProfile)
def profile(db: SessionDep, student: StudentUser) -> StudentPortalProfile:
    return _profile(db, student)


@router.get("/attendance", response_model=StudentPortalAttendanceRead)
def attendance(db: SessionDep, student: StudentUser) -> StudentPortalAttendanceRead:
    items = list(
        db.scalars(select(AttendanceTable).where(AttendanceTable.student_id == student.id).order_by(AttendanceTable.created_at.desc()))
    )
    return StudentPortalAttendanceRead(
        summary=_attendance_summary(db, student.id),
        items=[AttendanceRead.model_validate(item) for item in items],
    )


@router.get("/payments", response_model=StudentPortalPaymentsRead)
def payments(db: SessionDep, student: StudentUser) -> StudentPortalPaymentsRead:
    items = list(db.scalars(select(Payment).where(Payment.student_id == student.id).order_by(Payment.payment_date.desc(), Payment.id.desc())))
    return StudentPortalPaymentsRead(
        summary=_payment_summary(db, student.id, student.group_id),
        items=[PaymentRead.model_validate(item) for item in items],
    )


@router.get("/homework", response_model=list[StudentHomeworkPortalItem])
def homework(db: SessionDep, student: StudentUser) -> list[StudentHomeworkPortalItem]:
    return _homework_items(db, student.id, student.group_id)


@router.get("/schedule", response_model=StudentPortalScheduleRead)
def schedule(db: SessionDep, student: StudentUser) -> StudentPortalScheduleRead:
    profile = _profile(db, student)
    return StudentPortalScheduleRead(items=_schedule_items(db, student.group_id, profile.teacher_name))
