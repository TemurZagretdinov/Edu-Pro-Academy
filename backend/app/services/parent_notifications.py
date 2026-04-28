from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.attendance import AttendanceTable
from app.models.group import Group
from app.models.homework import Homework, HomeworkStatus
from app.models.lesson_time import LessonTimeTable
from app.models.parent import Notification, Parent, ParentConnectionCode, ParentStudentLink
from app.models.student import Student
from app.services.message_templates import (
    build_absent_message,
    build_bad_grade_message,
    build_homework_message,
    build_late_message,
    build_payment_message,
    student_full_name,
)
from app.services.telegram_sender import send_telegram_message_sync


def _student_name(student: Student) -> str:
    return student_full_name(student.firstname, student.lastname)


def _group_name(student: Student, fallback: str | None = None) -> str:
    if student.group:
        return student.group.name
    return fallback or "Guruhsiz"


def _teacher_name(student: Student, homework: Homework | None = None) -> str | None:
    if homework and homework.teacher:
        return homework.teacher.name
    if student.group and student.group.teacher:
        return student.group.teacher.name
    return None


def _generate_code() -> str:
    return secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def create_parent_connection_code(
    db: Session,
    student: Student,
    relation_type: str = "guardian",
    is_primary: bool = True,
    expires_in_hours: int = 168,
    commit: bool = True,
) -> ParentConnectionCode:
    code = _generate_code()
    while db.scalar(select(ParentConnectionCode).where(ParentConnectionCode.code == code)) is not None:
        code = _generate_code()
    row = ParentConnectionCode(
        student_id=student.id,
        code=code,
        relation_type=relation_type,
        is_primary=is_primary,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row


def link_parent_to_student(
    db: Session,
    parent: Parent,
    student: Student,
    relation_type: str = "guardian",
    is_primary: bool = True,
) -> ParentStudentLink:
    link = db.scalar(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == student.id,
        )
    )
    if link is None:
        link = ParentStudentLink(parent_id=parent.id, student_id=student.id, relation_type=relation_type, is_primary=is_primary)
    else:
        link.relation_type = relation_type
        link.is_primary = is_primary
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def link_parent_by_code(
    db: Session,
    code: str,
    telegram_chat_id: str,
    telegram_user_id: str,
    full_name: str,
    phone_number: str | None = None,
) -> tuple[Parent, Student]:
    normalized_code = code.strip().upper()
    connection_code = db.scalar(select(ParentConnectionCode).where(ParentConnectionCode.code == normalized_code))
    now = datetime.now(timezone.utc)
    if connection_code is None:
        raise ValueError("❌ <b>Kod noto'g'ri yoki muddati tugagan</b>\n\nIltimos, admin bergan kodni tekshirib qayta yuboring.")
    if connection_code.is_used:
        raise ValueError("ℹ️ <b>Bu ulash kodi allaqachon ishlatilgan</b>\n\nYangi kod olish uchun administrator bilan bog'laning.")
    if connection_code.expires_at is not None and _as_aware(connection_code.expires_at) < now:
        raise ValueError("❌ <b>Kod noto'g'ri yoki muddati tugagan</b>\n\nYangi kod olish uchun administrator bilan bog'laning.")

    student = db.get(Student, connection_code.student_id)
    if student is None:
        raise ValueError("⚠️ <b>Farzand profili topilmadi</b>\n\nIltimos, administrator bilan bog'laning.")

    parent = db.scalar(select(Parent).where(Parent.telegram_user_id == str(telegram_user_id)))
    if parent is None:
        parent = db.scalar(select(Parent).where(Parent.telegram_chat_id == str(telegram_chat_id)))
    if parent is None:
        parent = Parent(full_name=full_name, phone_number=phone_number)

    parent.full_name = full_name or parent.full_name
    if phone_number:
        parent.phone_number = phone_number
    parent.telegram_chat_id = str(telegram_chat_id)
    parent.telegram_user_id = str(telegram_user_id)
    parent.is_connected = True
    db.add(parent)
    db.flush()

    link = db.scalar(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == student.id,
        )
    )
    if link is None:
        db.add(
            ParentStudentLink(
                parent_id=parent.id,
                student_id=student.id,
                relation_type=connection_code.relation_type,
                is_primary=connection_code.is_primary,
            )
        )

    connection_code.is_used = True
    connection_code.used_at = now
    db.add(connection_code)
    db.commit()
    db.refresh(parent)
    db.refresh(student)
    return parent, student


def linked_students_for_telegram_user(db: Session, telegram_user_id: str) -> list[Student]:
    parent = db.scalar(
        select(Parent)
        .options(
            selectinload(Parent.student_links)
            .selectinload(ParentStudentLink.student)
            .selectinload(Student.group)
            .selectinload(Group.teacher)
        )
        .where(Parent.telegram_user_id == str(telegram_user_id))
    )
    if parent is None:
        return []
    return [link.student for link in parent.student_links if link.student is not None]


def recent_notifications_for_telegram_user(db: Session, telegram_user_id: str, limit: int = 5) -> list[Notification]:
    parent = db.scalar(select(Parent).where(Parent.telegram_user_id == str(telegram_user_id)))
    if parent is None:
        return []
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.parent_id == parent.id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
    )


def send_telegram_message(chat_id: str | None, text: str, parse_mode: str | None = "HTML") -> bool:
    if not chat_id:
        return False
    return send_telegram_message_sync(chat_id, text, parse_mode=parse_mode)


def _existing_notification(
    db: Session,
    *,
    parent_id: int,
    student_id: int,
    notification_type: str,
    title: str,
    message: str,
) -> Notification | None:
    return db.scalar(
        select(Notification)
        .where(
            Notification.parent_id == parent_id,
            Notification.student_id == student_id,
            Notification.type == notification_type,
            Notification.title == title,
            Notification.message == message,
        )
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )


def notify_student_parents(db: Session, student: Student, notification_type: str, title: str, message: str) -> list[Notification]:
    links = list(
        db.scalars(
            select(ParentStudentLink)
            .options(selectinload(ParentStudentLink.parent))
            .where(ParentStudentLink.student_id == student.id)
        )
    )
    notifications: list[Notification] = []
    for link in links:
        parent = link.parent
        if parent is None:
            continue
        existing = _existing_notification(
            db,
            parent_id=parent.id,
            student_id=student.id,
            notification_type=notification_type,
            title=title,
            message=message,
        )
        if existing is not None:
            if not existing.is_sent:
                sent = send_telegram_message(parent.telegram_chat_id, message)
                if sent:
                    existing.is_sent = True
                    existing.sent_at = datetime.now(timezone.utc)
                    db.add(existing)
            notifications.append(existing)
            continue

        sent = send_telegram_message(parent.telegram_chat_id, message)
        notification = Notification(
            student_id=student.id,
            parent_id=parent.id,
            type=notification_type,
            title=title,
            message=message,
            is_sent=sent,
            sent_at=datetime.now(timezone.utc) if sent else None,
        )
        db.add(notification)
        notifications.append(notification)
    db.commit()
    for notification in notifications:
        db.refresh(notification)
    return notifications


def notify_attendance_event(db: Session, attendance: AttendanceTable) -> list[Notification]:
    if attendance.status not in {"absent", "late"}:
        return []
    student = db.scalar(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.teacher))
        .where(Student.id == attendance.student_id)
    )
    if student is None:
        return []
    group_name = _group_name(student)
    teacher_name = _teacher_name(student)
    if attendance.status == "absent":
        title = "Davomat haqida bildirishnoma"
        message = build_absent_message(
            student_name=_student_name(student),
            group_name=group_name,
            teacher_name=teacher_name,
            attendance_date=attendance.date,
            note=attendance.note,
        )
        notification_type = "absent"
    else:
        title = "Davomat haqida bildirishnoma"
        message = build_late_message(
            student_name=_student_name(student),
            group_name=group_name,
            teacher_name=teacher_name,
            attendance_date=attendance.date,
            note=attendance.note,
        )
        notification_type = "late"
    return notify_student_parents(db, student, notification_type, title, message)


def notify_bad_grade_for_attendance(
    db: Session,
    attendance: AttendanceTable,
    *,
    previous_grade: int | None = None,
) -> list[Notification]:
    if attendance.grade is None:
        return []
    if attendance.grade > settings.parent_bad_grade_threshold:
        return []
    if previous_grade == attendance.grade:
        return []

    student = db.scalar(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.teacher))
        .where(Student.id == attendance.student_id)
    )
    if student is None:
        return []

    lesson = None
    if attendance.lesson_id is not None:
        lesson = db.get(LessonTimeTable, attendance.lesson_id)
    title = "Baholar haqida bildirishnoma"
    message = build_bad_grade_message(
        student_name=_student_name(student),
        group_name=_group_name(student),
        teacher_name=_teacher_name(student),
        lesson_title=lesson.title if lesson else "Dars",
        grade_value=attendance.grade,
        max_score=100,
        created_at=attendance.date,
        note=attendance.note,
    )
    return notify_student_parents(db, student, "bad_grade", title, message)


def notify_homework_missing(db: Session, status_row: HomeworkStatus) -> list[Notification]:
    if status_row.is_completed:
        return []
    student = db.scalar(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.teacher))
        .where(Student.id == status_row.student_id)
    )
    homework = db.scalar(
        select(Homework)
        .options(selectinload(Homework.group), selectinload(Homework.teacher))
        .where(Homework.id == status_row.homework_id)
    )
    if student is None or homework is None:
        return []
    group_name = _group_name(student, homework.group.name if homework.group else None)
    title = "Vazifa haqida bildirishnoma"
    message = build_homework_message(
        student_name=_student_name(student),
        group_name=group_name,
        homework_title=homework.title,
        homework_date=homework.due_date or homework.created_at,
        note=status_row.note,
    )
    return notify_student_parents(db, student, "homework_missing", title, message)


def notify_payment_reminder(
    db: Session,
    student_id: int,
    month: date | datetime | str | None = None,
    debt_amount: Decimal | int | float | str | None = None,
    status_text: str = "To'lov mavjud emas",
    note: str | None = None,
) -> list[Notification]:
    student = db.scalar(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.teacher))
        .where(Student.id == student_id)
    )
    if student is None:
        return []
    title = "To'lov haqida eslatma"
    message = build_payment_message(
        student_name=_student_name(student),
        group_name=_group_name(student),
        month=month,
        debt_amount=debt_amount,
        status_text=status_text,
        note=note,
    )
    return notify_student_parents(db, student, "payment_reminder", title, message)
