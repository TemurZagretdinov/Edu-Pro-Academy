from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, SessionDep
from app.crud import attendance as attendance_crud
from app.models.attendance import AttendanceTable
from app.models.lesson_time import LessonTimeTable
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.services.notifications import send_attendance_notification
from app.services.parent_notifications import notify_bad_grade_for_attendance
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


def _existing_attendance(db: SessionDep, payload: AttendanceCreate) -> AttendanceTable | None:
    if payload.lesson_id is not None:
        return db.scalar(
            select(AttendanceTable).where(
                AttendanceTable.student_id == payload.student_id,
                AttendanceTable.lesson_id == payload.lesson_id,
            )
        )
    if payload.group_id is not None and payload.date is not None:
        return db.scalar(
            select(AttendanceTable).where(
                AttendanceTable.student_id == payload.student_id,
                AttendanceTable.group_id == payload.group_id,
                AttendanceTable.date == payload.date,
            )
        )
    return None


@router.post("", response_model=AttendanceRead)
def mark_attendance(payload: AttendanceCreate, db: SessionDep, _admin: AdminUser) -> AttendanceRead:
    if payload.lesson_id is None and (payload.group_id is None or payload.date is None):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="lesson_id or group_id/date is required")
    try:
        existing = _existing_attendance(db, payload)
        previous_grade = existing.grade if existing is not None else None
        attendance = attendance_crud.mark_attendance(db, payload)
        send_attendance_notification(db, attendance.student_id, attendance.status, attendance.date, attendance.note)
        notify_bad_grade_for_attendance(db, attendance, previous_grade=previous_grade)
        return attendance
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[AttendanceRead])
def list_attendance(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    student_id: int | None = None,
    group_id: int | None = None,
    attendance_date: date | None = None,
) -> list[AttendanceRead]:
    query = select(AttendanceTable).offset(skip).limit(limit).order_by(AttendanceTable.created_at.desc())
    if student_id is not None:
        query = query.where(AttendanceTable.student_id == student_id)
    if group_id is not None:
        query = query.where(AttendanceTable.group_id == group_id)
    if attendance_date is not None:
        query = query.where(AttendanceTable.date == attendance_date)
    return list(db.scalars(query))


@router.get("/students/{student_id}", response_model=list[AttendanceRead])
def list_attendance_by_student(student_id: int, db: SessionDep, _admin: AdminUser) -> list[AttendanceRead]:
    return list(
        db.scalars(
            select(AttendanceTable)
            .where(AttendanceTable.student_id == student_id)
            .order_by(AttendanceTable.created_at.desc())
        )
    )


@router.get("/groups/{group_id}", response_model=list[AttendanceRead])
def list_attendance_by_group(group_id: int, db: SessionDep, _admin: AdminUser) -> list[AttendanceRead]:
    return list(
        db.scalars(
            select(AttendanceTable)
            .join(Student, Student.id == AttendanceTable.student_id)
            .where(Student.group_id == group_id)
            .order_by(AttendanceTable.created_at.desc())
        )
    )


@router.get("/lessons/{lesson_id}", response_model=list[AttendanceRead])
def list_attendance_by_lesson(lesson_id: int, db: SessionDep, _admin: AdminUser) -> list[AttendanceRead]:
    return list(
        db.scalars(
            select(AttendanceTable)
            .join(LessonTimeTable, LessonTimeTable.id == AttendanceTable.lesson_id)
            .where(AttendanceTable.lesson_id == lesson_id)
            .order_by(AttendanceTable.created_at.desc())
        )
    )


@router.put("/{attendance_id}", response_model=AttendanceRead)
def update_attendance(attendance_id: int, payload: AttendanceUpdate, db: SessionDep, _admin: AdminUser) -> AttendanceRead:
    attendance = attendance_crud.get_attendance(db, attendance_id)
    if not attendance:
        raise not_found("Attendance")
    previous_grade = attendance.grade
    updated = attendance_crud.update_attendance(db, attendance, payload)
    send_attendance_notification(db, updated.student_id, updated.status, updated.date, updated.note)
    notify_bad_grade_for_attendance(db, updated, previous_grade=previous_grade)
    return updated
