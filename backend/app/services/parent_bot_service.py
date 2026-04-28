from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.attendance import AttendanceTable
from app.models.group import Group
from app.models.homework import Homework, HomeworkStatus
from app.models.lesson_time import LessonTimeTable
from app.models.parent import Notification, Parent, ParentStudentLink
from app.models.payment import Payment
from app.models.student import Student
from app.models.time_month import TimeMonthTable
from app.services.message_templates import student_full_name


PAYMENT_CREDIT_STATUSES = {"paid", "partial"}


@dataclass(frozen=True)
class ParentLinkedChild:
    student_id: int
    full_name: str
    group_name: str | None
    teacher_name: str | None
    phone_number: str | None
    relation_type: str | None
    is_active: bool


@dataclass(frozen=True)
class ParentContext:
    parent_id: int
    parent_name: str
    phone_number: str | None
    telegram_chat_id: str | None
    children: list[ParentLinkedChild]


@dataclass(frozen=True)
class AttendanceHistoryItem:
    attendance_date: date
    status: str
    note: str | None
    lesson_title: str | None


@dataclass(frozen=True)
class AttendanceSummaryView:
    today_status: str | None
    attendance_percent: float
    present_count: int
    late_count: int
    absent_count: int
    history: list[AttendanceHistoryItem]


@dataclass(frozen=True)
class GradeItem:
    attendance_date: date
    grade_value: int
    lesson_title: str | None
    note: str | None
    teacher_name: str | None
    is_bad: bool


@dataclass(frozen=True)
class GradeSummaryView:
    average_grade: float | None
    total_count: int
    bad_count: int
    threshold: int
    items: list[GradeItem]


@dataclass(frozen=True)
class HomeworkItemView:
    homework_id: int
    title: str
    description: str | None
    due_date: date | None
    created_at: datetime
    is_active: bool
    is_completed: bool
    submitted_at: datetime | None
    note: str | None
    teacher_name: str | None
    is_overdue: bool


@dataclass(frozen=True)
class HomeworkSummaryView:
    total_count: int
    completed_count: int
    pending_count: int
    overdue_count: int
    items: list[HomeworkItemView]


@dataclass(frozen=True)
class PaymentRecordView:
    payment_date: date
    amount: Decimal
    status: str
    paid_for_month: date | None
    note: str | None
    is_cash: bool


@dataclass(frozen=True)
class PaymentSummaryView:
    total_paid: Decimal
    current_debt: Decimal
    monthly_fee: Decimal
    last_payment_date: date | None
    unpaid_months: list[date]
    items: list[PaymentRecordView]


@dataclass(frozen=True)
class ParentNotificationItem:
    title: str
    message: str
    notification_type: str
    created_at: datetime | None
    is_sent: bool
    student_name: str | None


class ParentBotService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_parent_context(self, telegram_user_id: str) -> ParentContext | None:
        parent = self._parent_for_user(telegram_user_id)
        if parent is None:
            return None
        children: list[ParentLinkedChild] = []
        for link in sorted(
            parent.student_links,
            key=lambda item: (not item.is_primary, student_full_name(item.student.firstname, item.student.lastname) if item.student else ""),
        ):
            student = link.student
            if student is None:
                continue
            children.append(
                ParentLinkedChild(
                    student_id=student.id,
                    full_name=student_full_name(student.firstname, student.lastname),
                    group_name=student.group.name if student.group else "Guruhsiz",
                    teacher_name=student.group.teacher.name if student.group and student.group.teacher else None,
                    phone_number=student.phone_number,
                    relation_type=link.relation_type,
                    is_active=student.is_active,
                )
            )
        return ParentContext(
            parent_id=parent.id,
            parent_name=parent.full_name,
            phone_number=parent.phone_number,
            telegram_chat_id=parent.telegram_chat_id,
            children=children,
        )

    def get_linked_children(self, telegram_user_id: str) -> list[ParentLinkedChild]:
        context = self.get_parent_context(telegram_user_id)
        return context.children if context is not None else []

    def get_child_profile(self, telegram_user_id: str, student_id: int) -> ParentLinkedChild | None:
        context = self.get_parent_context(telegram_user_id)
        if context is None:
            return None
        return next((child for child in context.children if child.student_id == student_id), None)

    def get_child_attendance_summary(
        self,
        telegram_user_id: str,
        student_id: int,
        history_limit: int = 10,
    ) -> AttendanceSummaryView | None:
        student = self._linked_student(telegram_user_id, student_id)
        if student is None:
            return None

        counts = {
            row[0]: row[1]
            for row in self.db.execute(
                select(AttendanceTable.status, func.count(AttendanceTable.id))
                .where(AttendanceTable.student_id == student_id)
                .group_by(AttendanceTable.status)
            ).all()
        }
        present_count = counts.get("present", 0) + counts.get("came", 0)
        late_count = counts.get("late", 0)
        absent_count = counts.get("absent", 0)
        total = present_count + late_count + absent_count
        today_row = self.db.scalar(
            select(AttendanceTable)
            .where(AttendanceTable.student_id == student_id, AttendanceTable.date == date.today())
            .order_by(AttendanceTable.created_at.desc(), AttendanceTable.id.desc())
        )
        history_rows = list(
            self.db.scalars(
                select(AttendanceTable)
                .options(selectinload(AttendanceTable.lesson))
                .where(AttendanceTable.student_id == student_id)
                .order_by(AttendanceTable.date.desc(), AttendanceTable.created_at.desc(), AttendanceTable.id.desc())
                .limit(history_limit)
            )
        )
        history = [
            AttendanceHistoryItem(
                attendance_date=row.date,
                status=row.status,
                note=row.note,
                lesson_title=row.lesson.title if row.lesson else None,
            )
            for row in history_rows
        ]
        attendance_percent = round(((present_count + late_count) / total) * 100, 1) if total else 0.0
        return AttendanceSummaryView(
            today_status=today_row.status if today_row else None,
            attendance_percent=attendance_percent,
            present_count=present_count,
            late_count=late_count,
            absent_count=absent_count,
            history=history,
        )

    def get_child_grades(
        self,
        telegram_user_id: str,
        student_id: int,
        limit: int = 10,
    ) -> GradeSummaryView | None:
        student = self._linked_student(telegram_user_id, student_id)
        if student is None:
            return None

        threshold = settings.parent_bad_grade_threshold
        average_grade = self.db.scalar(
            select(func.avg(AttendanceTable.grade)).where(
                AttendanceTable.student_id == student_id,
                AttendanceTable.grade.is_not(None),
            )
        )
        total_count = self.db.scalar(
            select(func.count(AttendanceTable.id)).where(
                AttendanceTable.student_id == student_id,
                AttendanceTable.grade.is_not(None),
            )
        ) or 0
        bad_count = self.db.scalar(
            select(func.count(AttendanceTable.id)).where(
                AttendanceTable.student_id == student_id,
                AttendanceTable.grade.is_not(None),
                AttendanceTable.grade <= threshold,
            )
        ) or 0
        grade_rows = list(
            self.db.scalars(
                select(AttendanceTable)
                .options(selectinload(AttendanceTable.lesson))
                .where(
                    AttendanceTable.student_id == student_id,
                    AttendanceTable.grade.is_not(None),
                )
                .order_by(AttendanceTable.date.desc(), AttendanceTable.created_at.desc(), AttendanceTable.id.desc())
                .limit(limit)
            )
        )
        teacher_name = student.group.teacher.name if student.group and student.group.teacher else None
        items = [
            GradeItem(
                attendance_date=row.date,
                grade_value=row.grade or 0,
                lesson_title=row.lesson.title if row.lesson else "Dars",
                note=row.note,
                teacher_name=teacher_name,
                is_bad=(row.grade or 0) <= threshold,
            )
            for row in grade_rows
            if row.grade is not None
        ]
        return GradeSummaryView(
            average_grade=round(float(average_grade), 1) if average_grade is not None else None,
            total_count=total_count,
            bad_count=bad_count,
            threshold=threshold,
            items=items,
        )

    def get_child_homework(
        self,
        telegram_user_id: str,
        student_id: int,
        limit: int = 10,
    ) -> HomeworkSummaryView | None:
        student = self._linked_student(telegram_user_id, student_id)
        if student is None:
            return None
        if student.group_id is None:
            return HomeworkSummaryView(total_count=0, completed_count=0, pending_count=0, overdue_count=0, items=[])

        status_rows = list(self.db.scalars(select(HomeworkStatus).where(HomeworkStatus.student_id == student_id)))
        statuses = {item.homework_id: item for item in status_rows}
        homeworks = list(
            self.db.scalars(
                select(Homework)
                .options(selectinload(Homework.teacher))
                .where(Homework.group_id == student.group_id)
                .order_by(Homework.created_at.desc(), Homework.id.desc())
                .limit(limit)
            )
        )
        today = date.today()
        items = [
            HomeworkItemView(
                homework_id=homework.id,
                title=homework.title,
                description=homework.description,
                due_date=homework.due_date,
                created_at=homework.created_at,
                is_active=homework.is_active,
                is_completed=statuses[homework.id].is_completed if homework.id in statuses else False,
                submitted_at=statuses[homework.id].submitted_at if homework.id in statuses else None,
                note=statuses[homework.id].note if homework.id in statuses else None,
                teacher_name=homework.teacher.name if homework.teacher else None,
                is_overdue=bool(
                    not (statuses[homework.id].is_completed if homework.id in statuses else False)
                    and homework.due_date is not None
                    and homework.due_date < today
                ),
            )
            for homework in homeworks
        ]
        completed_count = sum(1 for item in items if item.is_completed)
        overdue_count = sum(1 for item in items if item.is_overdue)
        total_count = len(items)
        return HomeworkSummaryView(
            total_count=total_count,
            completed_count=completed_count,
            pending_count=total_count - completed_count,
            overdue_count=overdue_count,
            items=items,
        )

    def get_child_payment_info(
        self,
        telegram_user_id: str,
        student_id: int,
        limit: int = 6,
    ) -> PaymentSummaryView | None:
        student = self._linked_student(telegram_user_id, student_id)
        if student is None:
            return None

        payments = list(
            self.db.scalars(
                select(Payment)
                .where(Payment.student_id == student_id)
                .order_by(Payment.payment_date.desc(), Payment.id.desc())
            )
        )
        total_paid = self.db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.student_id == student_id,
                Payment.status.in_(PAYMENT_CREDIT_STATUSES),
            )
        ) or Decimal("0")
        last_payment_date = self.db.scalar(
            select(func.max(Payment.payment_date)).where(
                Payment.student_id == student_id,
                Payment.status.in_(PAYMENT_CREDIT_STATUSES),
            )
        )
        monthly_fee = self._monthly_fee(student.group_id)
        if monthly_fee <= 0:
            current_debt = Decimal("0")
        else:
            billable_months = [self._month_start(self._payment_month(payment)) for payment in payments if payment.payment_date]
            first_month = min(billable_months) if billable_months else self._month_start(date.today())
            months_due = self._months_inclusive(first_month, self._month_start(date.today()))
            expected_total = monthly_fee * Decimal(months_due)
            current_debt = max(expected_total - total_paid, Decimal("0"))

        credited_months = {
            self._month_start(self._payment_month(payment))
            for payment in payments
            if payment.status in PAYMENT_CREDIT_STATUSES
        }
        unpaid_months: list[date] = []
        if monthly_fee > 0:
            month_cursor = min(credited_months) if credited_months else self._month_start(date.today())
            for month_value in self._month_range(month_cursor, self._month_start(date.today())):
                if month_value not in credited_months:
                    unpaid_months.append(month_value)

        return PaymentSummaryView(
            total_paid=Decimal(str(total_paid)),
            current_debt=Decimal(str(current_debt)),
            monthly_fee=Decimal(str(monthly_fee)),
            last_payment_date=last_payment_date,
            unpaid_months=unpaid_months[-6:],
            items=[
                PaymentRecordView(
                    payment_date=item.payment_date,
                    amount=item.amount,
                    status=item.status,
                    paid_for_month=item.paid_for_month,
                    note=item.note,
                    is_cash=item.is_cash,
                )
                for item in payments[:limit]
            ],
        )

    def get_recent_parent_notifications(
        self,
        telegram_user_id: str,
        student_id: int | None = None,
        limit: int = 8,
    ) -> list[ParentNotificationItem]:
        context = self.get_parent_context(telegram_user_id)
        if context is None:
            return []
        allowed_ids = {child.student_id for child in context.children}
        if student_id is not None and student_id not in allowed_ids:
            return []
        query = (
            select(Notification)
            .options(selectinload(Notification.student))
            .where(Notification.parent_id == context.parent_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
        if student_id is not None:
            query = query.where(Notification.student_id == student_id)
        rows = list(self.db.scalars(query))
        return [
            ParentNotificationItem(
                title=row.title,
                message=row.message,
                notification_type=row.type,
                created_at=row.created_at,
                is_sent=row.is_sent,
                student_name=student_full_name(row.student.firstname, row.student.lastname) if row.student else None,
            )
            for row in rows
        ]

    def get_latest_grade_item(self, telegram_user_id: str, student_id: int) -> GradeItem | None:
        summary = self.get_child_grades(telegram_user_id, student_id, limit=1)
        if summary is None or not summary.items:
            return None
        return summary.items[0]

    def update_parent_phone(self, telegram_user_id: str, phone_number: str) -> bool:
        parent = self._parent_for_user(telegram_user_id)
        if parent is None:
            return False
        normalized_phone = phone_number.strip()
        if not normalized_phone:
            return False
        parent.phone_number = normalized_phone
        self.db.add(parent)
        self.db.commit()
        return True

    def _parent_for_user(self, telegram_user_id: str) -> Parent | None:
        return self.db.scalar(
            select(Parent)
            .options(
                selectinload(Parent.student_links)
                .selectinload(ParentStudentLink.student)
                .selectinload(Student.group)
                .selectinload(Group.teacher)
            )
            .where(Parent.telegram_user_id == str(telegram_user_id))
        )

    def _linked_student(self, telegram_user_id: str, student_id: int) -> Student | None:
        context = self.get_parent_context(telegram_user_id)
        if context is None or student_id not in {child.student_id for child in context.children}:
            return None
        return self.db.scalar(
            select(Student)
            .options(selectinload(Student.group).selectinload(Group.teacher))
            .where(Student.id == student_id)
        )

    def _monthly_fee(self, group_id: int | None) -> Decimal:
        if group_id is None:
            return Decimal("0")
        price = self.db.scalar(
            select(TimeMonthTable.price)
            .where(TimeMonthTable.group_id == group_id)
            .order_by(TimeMonthTable.datetime.desc(), TimeMonthTable.id.desc())
            .limit(1)
        )
        return Decimal(str(price or 0))

    @staticmethod
    def _month_start(value: date) -> date:
        return value.replace(day=1)

    @staticmethod
    def _months_inclusive(start: date, end: date) -> int:
        return (end.year - start.year) * 12 + end.month - start.month + 1

    @staticmethod
    def _payment_month(payment: Payment) -> date:
        if payment.paid_for_month:
            return payment.paid_for_month.replace(day=1)
        return payment.payment_date.replace(day=1)

    @staticmethod
    def _month_range(start: date, end: date) -> list[date]:
        months: list[date] = []
        cursor = start.replace(day=1)
        target = end.replace(day=1)
        while cursor <= target:
            months.append(cursor)
            if cursor.month == 12:
                cursor = cursor.replace(year=cursor.year + 1, month=1)
            else:
                cursor = cursor.replace(month=cursor.month + 1)
        return months
