from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceTable
from app.models.parent import Notification
from app.services.parent_notifications import notify_attendance_event


def send_attendance_notification(
    db: Session,
    student_id: int,
    status: str,
    attendance_date: date | None = None,
    note: str | None = None,
) -> list[Notification]:
    if status not in {"absent", "late"}:
        return []
    attendance = AttendanceTable(
        student_id=student_id,
        status=status,
        date=attendance_date or date.today(),
        note=note,
    )
    return notify_attendance_event(db, attendance)
