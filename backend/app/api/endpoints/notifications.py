from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import AdminUser, SessionDep
from app.models.parent import Notification, ParentStudentLink
from app.models.student import Student
from app.schemas.parent import NotificationRead, TestNotificationRequest
from app.services.message_templates import (
    build_absent_message,
    build_announcement_message,
    build_bad_grade_message,
    build_homework_message,
    build_late_message,
    build_payment_message,
    student_full_name,
)
from app.services.parent_notifications import notify_student_parents
from app.utils.helpers import not_found

router = APIRouter()


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    student_id: int | None = None,
    parent_id: int | None = None,
    type: str | None = None,
    is_sent: bool | None = None,
) -> list[NotificationRead]:
    query = select(Notification)
    if student_id is not None:
        query = query.where(Notification.student_id == student_id)
    if parent_id is not None:
        query = query.where(Notification.parent_id == parent_id)
    if type is not None:
        query = query.where(Notification.type == type)
    if is_sent is not None:
        query = query.where(Notification.is_sent.is_(is_sent))
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


@router.post("/test-send", response_model=list[NotificationRead])
def test_send(payload: TestNotificationRequest, db: SessionDep, _admin: AdminUser) -> list[NotificationRead]:
    student = db.get(Student, payload.student_id)
    if not student:
        raise not_found("Student")
    if not db.scalar(select(ParentStudentLink).where(ParentStudentLink.student_id == student.id)):
        raise not_found("Linked parent")
    student_name = student_full_name(student.firstname, student.lastname)
    group_name = student.group.name if student.group else "Guruhsiz"
    message = _build_test_message(payload, student_name, group_name)
    return notify_student_parents(db, student, payload.type, payload.title, message)


def _build_test_message(payload: TestNotificationRequest, student_name: str, group_name: str) -> str:
    if payload.message:
        return build_announcement_message(
            title=payload.title,
            message=payload.message,
            student_name=student_name,
            group_name=group_name,
        )
    if payload.type == "absent":
        return build_absent_message(student_name=student_name, group_name=group_name, attendance_date=date.today())
    if payload.type == "late":
        return build_late_message(student_name=student_name, group_name=group_name, attendance_date=date.today())
    if payload.type == "bad_grade":
        return build_bad_grade_message(
            student_name=student_name,
            group_name=group_name,
            lesson_title="Nazorat ishi",
            grade_value=45,
            max_score=100,
            created_at=date.today(),
        )
    if payload.type == "homework_missing":
        return build_homework_message(student_name=student_name, group_name=group_name, homework_date=date.today())
    if payload.type == "payment_reminder":
        return build_payment_message(student_name=student_name, group_name=group_name, month=date.today())
    return build_announcement_message(
        title=payload.title,
        message="Ulanish ishlayapti. Endi muhim bildirishnomalar shu bot orqali yetib boradi.",
        student_name=student_name,
        group_name=group_name,
    )
