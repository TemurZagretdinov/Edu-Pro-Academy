from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceTable
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate


def get_attendance(db: Session, attendance_id: int) -> AttendanceTable | None:
    return db.get(AttendanceTable, attendance_id)


def mark_attendance(db: Session, payload: AttendanceCreate) -> AttendanceTable:
    attendance = None
    if payload.lesson_id is not None:
        attendance = db.scalar(
            select(AttendanceTable).where(
                AttendanceTable.student_id == payload.student_id,
                AttendanceTable.lesson_id == payload.lesson_id,
            )
        )
    elif payload.group_id is not None and payload.date is not None:
        attendance = db.scalar(
            select(AttendanceTable).where(
                AttendanceTable.student_id == payload.student_id,
                AttendanceTable.group_id == payload.group_id,
                AttendanceTable.date == payload.date,
            )
        )
    if attendance is None:
        attendance = AttendanceTable(**payload.model_dump(exclude_none=True))
    else:
        attendance.status = payload.status
        attendance.reason = payload.reason
        attendance.note = payload.note
        attendance.grade = payload.grade
        if payload.teacher_id is not None:
            attendance.teacher_id = payload.teacher_id
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def update_attendance(db: Session, attendance: AttendanceTable, payload: AttendanceUpdate) -> AttendanceTable:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance
