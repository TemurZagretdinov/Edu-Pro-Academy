from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, SessionDep
from app.models.attendance import AttendanceTable
from app.models.group import Group
from app.models.lesson_time import LessonTimeTable
from app.models.student import Student
from app.models.time_month import TimeMonthTable
from app.schemas.lesson_time import LessonJournalBatchSave, LessonJournalRow, LessonJournalStudent, LessonTimeCreate, LessonTimeRead, LessonTimeUpdate
from app.schemas.time_month import TimeMonthCreate, TimeMonthRead, TimeMonthUpdate
from app.services.notifications import send_attendance_notification
from app.services.parent_notifications import notify_bad_grade_for_attendance
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


@router.post("", response_model=LessonTimeRead, status_code=status.HTTP_201_CREATED)
def create_lesson(payload: LessonTimeCreate, db: SessionDep, _admin: AdminUser) -> LessonTimeRead:
    if payload.group_id is not None and not db.get(Group, payload.group_id):
        raise not_found("Group")
    if payload.time_id is not None:
        month = db.get(TimeMonthTable, payload.time_id)
        if not month:
            raise not_found("Month record")
        if payload.group_id is not None and month.group_id != payload.group_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month does not belong to this group")
    lesson = LessonTimeTable(**payload.model_dump())
    try:
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        return lesson
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[LessonTimeRead])
def list_lessons(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    group_id: int | None = None,
    time_id: int | None = None,
) -> list[LessonTimeRead]:
    query = select(LessonTimeTable).offset(skip).limit(limit).order_by(LessonTimeTable.datetime.asc(), LessonTimeTable.id.asc())
    if group_id is not None:
        query = query.where(LessonTimeTable.group_id == group_id)
    if time_id is not None:
        query = query.where(LessonTimeTable.time_id == time_id)
    return list(db.scalars(query))


@router.put("/{lesson_id}", response_model=LessonTimeRead)
def update_lesson(lesson_id: int, payload: LessonTimeUpdate, db: SessionDep, _admin: AdminUser) -> LessonTimeRead:
    lesson = db.get(LessonTimeTable, lesson_id)
    if not lesson:
        raise not_found("Lesson")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    try:
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        return lesson
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.post("/months", response_model=TimeMonthRead, status_code=status.HTTP_201_CREATED)
def create_month(payload: TimeMonthCreate, db: SessionDep, _admin: AdminUser) -> TimeMonthRead:
    if not db.get(Group, payload.group_id):
        raise not_found("Group")
    month_start = payload.datetime.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        next_month = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month = month_start.replace(month=month_start.month + 1)
    existing = db.scalar(
        select(TimeMonthTable).where(
            TimeMonthTable.group_id == payload.group_id,
            TimeMonthTable.datetime >= month_start,
            TimeMonthTable.datetime < next_month,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Month already exists for this group")
    month = TimeMonthTable(**payload.model_dump())
    try:
        db.add(month)
        db.commit()
        db.refresh(month)
        return month
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("/months", response_model=list[TimeMonthRead])
def list_months(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    group_id: int | None = None,
) -> list[TimeMonthRead]:
    query = select(TimeMonthTable).offset(skip).limit(limit).order_by(TimeMonthTable.datetime.desc())
    if group_id is not None:
        query = query.where(TimeMonthTable.group_id == group_id)
    return list(db.scalars(query))


@router.put("/months/{month_id}", response_model=TimeMonthRead)
def update_month(month_id: int, payload: TimeMonthUpdate, db: SessionDep, _admin: AdminUser) -> TimeMonthRead:
    month = db.get(TimeMonthTable, month_id)
    if not month:
        raise not_found("Month record")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(month, field, value)
    try:
        db.add(month)
        db.commit()
        db.refresh(month)
        return month
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


def _lesson_or_404(db: SessionDep, lesson_id: int) -> LessonTimeTable:
    lesson = db.get(LessonTimeTable, lesson_id)
    if not lesson:
        raise not_found("Lesson")
    if lesson.group_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lesson is not attached to a group")
    return lesson


@router.get("/{lesson_id}/journal", response_model=list[LessonJournalRow])
def get_lesson_journal(lesson_id: int, db: SessionDep, _admin: AdminUser) -> list[LessonJournalRow]:
    lesson = _lesson_or_404(db, lesson_id)
    students = list(
        db.scalars(
            select(Student)
            .where(Student.group_id == lesson.group_id)
            .order_by(Student.lastname, Student.firstname)
        )
    )
    records = {
        record.student_id: record
        for record in db.scalars(select(AttendanceTable).where(AttendanceTable.lesson_id == lesson.id))
    }
    return [
        LessonJournalRow(
            student=LessonJournalStudent(
                id=student.id,
                firstname=student.firstname,
                lastname=student.lastname,
                phone_number=student.phone_number,
                is_active=student.is_active,
            ),
            attendance_id=records[student.id].id if student.id in records else None,
            status=records[student.id].status if student.id in records else None,
            grade=records[student.id].grade if student.id in records else None,
            note=records[student.id].note if student.id in records else None,
            saved=student.id in records,
        )
        for student in students
    ]


@router.put("/{lesson_id}/journal/batch", response_model=list[LessonJournalRow])
def save_lesson_journal(lesson_id: int, payload: LessonJournalBatchSave, db: SessionDep, _admin: AdminUser) -> list[LessonJournalRow]:
    lesson = _lesson_or_404(db, lesson_id)
    group = db.get(Group, lesson.group_id)
    if not group:
        raise not_found("Group")

    student_ids = [row.student_id for row in payload.rows]
    students = list(db.scalars(select(Student).where(Student.id.in_(student_ids))))
    students_by_id = {student.id: student for student in students}
    missing_ids = [student_id for student_id in student_ids if student_id not in students_by_id]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Students not found: {missing_ids}")
    invalid_ids = [student.id for student in students if student.group_id != lesson.group_id]
    if invalid_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Students are outside this group: {invalid_ids}")

    lesson_date = lesson.datetime.date()
    previous_grades: dict[int, int | None] = {}
    saved_records: list[AttendanceTable] = []
    for row in payload.rows:
        record = db.scalar(
            select(AttendanceTable).where(
                AttendanceTable.student_id == row.student_id,
                or_(
                    AttendanceTable.lesson_id == lesson.id,
                    (
                        (AttendanceTable.group_id == lesson.group_id)
                        & (AttendanceTable.date == lesson_date)
                    ),
                ),
            )
        )
        if record is None:
            record = AttendanceTable(
                student_id=row.student_id,
                lesson_id=lesson.id,
                group_id=lesson.group_id,
                teacher_id=group.teacher_id,
                date=lesson_date,
                status=row.status,
            )
            previous_grades[row.student_id] = None
        else:
            previous_grades[row.student_id] = record.grade
        record.lesson_id = lesson.id
        record.group_id = lesson.group_id
        record.teacher_id = group.teacher_id
        record.date = lesson_date
        record.status = row.status
        record.grade = row.grade
        record.note = row.note
        db.add(record)
        saved_records.append(record)

    try:
        db.commit()
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)
    for record in saved_records:
        db.refresh(record)
        send_attendance_notification(db, record.student_id, record.status, record.date, record.note)
        notify_bad_grade_for_attendance(db, record, previous_grade=previous_grades.get(record.student_id))
    return get_lesson_journal(lesson_id, db, _admin)
