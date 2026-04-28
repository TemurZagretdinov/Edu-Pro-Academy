from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import SessionDep, TeacherUser
from app.models.attendance import AttendanceTable
from app.models.group import Group, GroupTeacher
from app.models.homework import Homework, HomeworkStatus
from app.models.lesson_time import LessonTimeTable
from app.models.parent import ParentStudentLink
from app.models.student import Student
from app.schemas.attendance import AttendanceBatchUpsert, AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.schemas.group import GroupRead, GroupStudentInfo, GroupTeacherInfo
from app.schemas.homework import HomeworkCreate, HomeworkRead, HomeworkStatusRead, HomeworkStatusUpsert
from app.schemas.lesson_time import LessonTimeRead
from app.schemas.student import StudentRead, StudentRecentNote, TeacherStudentProgressRead
from app.services.notifications import send_attendance_notification
from app.services.parent_notifications import notify_bad_grade_for_attendance, notify_homework_missing
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


def group_read(group: Group, include_students: bool = False) -> GroupRead:
    students = list(group.students)
    return GroupRead(
        id=group.id,
        name=group.name,
        course_name=group.course_name,
        level=group.level,
        start_date=group.start_date,
        end_date=group.end_date,
        lesson_days=group.lesson_days,
        lesson_time=group.lesson_time,
        teacher_id=group.teacher_id,
        is_active=group.is_active,
        created_at=group.created_at,
        teacher=GroupTeacherInfo(id=group.teacher.id, full_name=group.teacher.name) if group.teacher else None,
        students_count=len(students),
        students=[
            GroupStudentInfo(
                id=student.id,
                firstname=student.firstname,
                lastname=student.lastname,
                phone_number=student.phone_number,
                is_active=student.is_active,
            )
            for student in students
        ]
        if include_students
        else [],
    )


def teacher_group_ids(db: SessionDep, teacher_id: int) -> list[int]:
    return list(
        db.scalars(
            select(Group.id)
            .outerjoin(GroupTeacher, GroupTeacher.group_id == Group.id)
            .where(or_(Group.teacher_id == teacher_id, GroupTeacher.teacher_id == teacher_id))
            .distinct()
        )
    )


@router.get("/groups", response_model=list[GroupRead])
def my_groups(db: SessionDep, current_user: TeacherUser) -> list[GroupRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if not group_ids:
        return []
    return [group_read(group) for group in db.scalars(select(Group).where(Group.id.in_(group_ids)).order_by(Group.name))]


@router.get("/groups/{group_id}", response_model=GroupRead)
def my_group(group_id: int, db: SessionDep, current_user: TeacherUser) -> GroupRead:
    group = db.get(Group, group_id)
    if not group:
        raise not_found("Group")
    if group_id not in teacher_group_ids(db, current_user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is outside your access")
    return group_read(group, include_students=True)


@router.get("/groups/{group_id}/students", response_model=list[StudentRead])
def my_group_students(group_id: int, db: SessionDep, current_user: TeacherUser) -> list[StudentRead]:
    group = db.get(Group, group_id)
    if not group:
        raise not_found("Group")
    if group_id not in teacher_group_ids(db, current_user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is outside your access")
    return list(db.scalars(select(Student).where(Student.group_id == group_id, Student.is_active.is_(True)).order_by(Student.lastname)))


@router.get("/students", response_model=list[StudentRead])
def my_students(
    db: SessionDep,
    current_user: TeacherUser,
    group_id: int | None = None,
    q: str | None = None,
    include_inactive: bool = False,
) -> list[StudentRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if group_id is not None:
        if group_id not in group_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is outside your access")
        group_ids = [group_id]
    if not group_ids:
        return []
    query = select(Student).where(Student.group_id.in_(group_ids)).order_by(Student.lastname, Student.firstname)
    if not include_inactive:
        query = query.where(Student.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Student.firstname.ilike(pattern), Student.lastname.ilike(pattern), Student.phone_number.ilike(pattern)))
    return list(db.scalars(query))


@router.get("/students/{student_id}/progress", response_model=TeacherStudentProgressRead)
def student_progress(student_id: int, db: SessionDep, current_user: TeacherUser) -> TeacherStudentProgressRead:
    student = db.get(Student, student_id)
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if not student:
        raise not_found("Student")
    if student.group_id not in group_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is outside your groups")
    attendance_total = db.scalar(select(func.count(AttendanceTable.id)).where(AttendanceTable.student_id == student_id)) or 0
    attendance_present = db.scalar(
        select(func.count(AttendanceTable.id)).where(
            AttendanceTable.student_id == student_id,
            AttendanceTable.status.in_(["present", "came", "late"]),
        )
    ) or 0
    homework_total = db.scalar(select(func.count(HomeworkStatus.id)).where(HomeworkStatus.student_id == student_id)) or 0
    homework_completed = db.scalar(
        select(func.count(HomeworkStatus.id)).where(HomeworkStatus.student_id == student_id, HomeworkStatus.is_completed.is_(True))
    ) or 0
    recent_notes: list[StudentRecentNote] = []
    if student.comment and student.comment.strip():
        recent_notes.append(
            StudentRecentNote(
                source="student",
                title="Talaba izohi",
                note=student.comment.strip(),
                created_at=student.created_at,
            )
        )
    attendance_notes = db.scalars(
        select(AttendanceTable)
        .where(
            AttendanceTable.student_id == student_id,
            AttendanceTable.note.is_not(None),
            AttendanceTable.note != "",
        )
        .order_by(AttendanceTable.created_at.desc())
        .limit(3)
    )
    status_labels = {
        "present": "Keldi",
        "came": "Keldi",
        "late": "Kechikdi",
        "absent": "Kelmadi",
        "excused": "Sababli",
    }
    for item in attendance_notes:
        recent_notes.append(
            StudentRecentNote(
                source="attendance",
                title=f"Davomat: {status_labels.get(item.status, item.status)}",
                note=(item.note or "").strip(),
                created_at=item.created_at,
            )
        )
    homework_notes = db.execute(
        select(HomeworkStatus, Homework.title, Homework.created_at)
        .join(Homework, Homework.id == HomeworkStatus.homework_id)
        .where(
            HomeworkStatus.student_id == student_id,
            HomeworkStatus.note.is_not(None),
            HomeworkStatus.note != "",
        )
        .order_by(func.coalesce(HomeworkStatus.submitted_at, Homework.created_at).desc())
        .limit(3)
    ).all()
    for status_row, homework_title, created_at in homework_notes:
        recent_notes.append(
            StudentRecentNote(
                source="homework",
                title=f"Vazifa: {homework_title}",
                note=(status_row.note or "").strip(),
                created_at=status_row.submitted_at or created_at,
            )
        )
    recent_notes.sort(key=lambda item: item.created_at or student.created_at, reverse=True)
    can_notify_parent = (
        db.scalar(select(ParentStudentLink.id).where(ParentStudentLink.student_id == student_id).limit(1)) is not None
    )
    return TeacherStudentProgressRead(
        student=StudentRead.model_validate(student),
        attendance_percent=round((attendance_present / attendance_total) * 100, 1) if attendance_total else 0,
        homework_percent=round((homework_completed / homework_total) * 100, 1) if homework_total else 0,
        attendance_total=attendance_total,
        homework_total=homework_total,
        recent_notes=recent_notes[:4],
        can_notify_parent=can_notify_parent,
    )


@router.get("/lessons", response_model=list[LessonTimeRead])
def my_lessons(
    db: SessionDep,
    current_user: TeacherUser,
    lesson_date: date | None = None,
) -> list[LessonTimeRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if not group_ids:
        return []
    query = select(LessonTimeTable).where(LessonTimeTable.group_id.in_(group_ids)).order_by(LessonTimeTable.datetime.desc())
    if lesson_date:
        query = query.where(func.date(LessonTimeTable.datetime) == lesson_date)
    return list(db.scalars(query))


@router.post("/attendance", response_model=AttendanceRead)
def mark_my_attendance(payload: AttendanceCreate, db: SessionDep, current_user: TeacherUser) -> AttendanceRead:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    lesson = db.get(LessonTimeTable, payload.lesson_id) if payload.lesson_id is not None else None
    target_group_id = payload.group_id or (lesson.group_id if lesson else None)
    student = db.get(Student, payload.student_id)
    if not student:
        raise not_found("Student")
    if target_group_id not in group_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attendance group is outside your access")
    if student.group_id != target_group_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is outside this group")
    payload.teacher_id = current_user.teacher_id
    if payload.date is None:
        payload.date = lesson.datetime.date() if lesson else date.today()
    payload.group_id = target_group_id
    try:
        if payload.lesson_id is not None:
            existing = db.scalar(
                select(AttendanceTable).where(
                    AttendanceTable.student_id == payload.student_id,
                    AttendanceTable.lesson_id == payload.lesson_id,
                )
            )
        else:
            existing = db.scalar(
                select(AttendanceTable).where(
                    AttendanceTable.student_id == payload.student_id,
                    AttendanceTable.group_id == payload.group_id,
                    AttendanceTable.date == payload.date,
                )
            )
        previous_grade = existing.grade if existing is not None else None
        if existing is None:
            attendance = AttendanceTable(**payload.model_dump(exclude_none=True))
        else:
            attendance = existing
            attendance.lesson_id = payload.lesson_id
            attendance.teacher_id = payload.teacher_id
            attendance.status = payload.status
            attendance.grade = payload.grade
            attendance.reason = payload.reason
            attendance.note = payload.note
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        send_attendance_notification(db, attendance.student_id, attendance.status, attendance.date, attendance.note)
        notify_bad_grade_for_attendance(db, attendance, previous_grade=previous_grade)
        return attendance
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.post("/attendance/batch", response_model=list[AttendanceRead])
def mark_my_attendance_batch(payload: AttendanceBatchUpsert, db: SessionDep, current_user: TeacherUser) -> list[AttendanceRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if payload.group_id not in group_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attendance group is outside your access")

    attendance_date = payload.date or date.today()
    student_ids = [item.student_id for item in payload.items]
    if len(student_ids) != len(set(student_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate students in batch payload")

    students = list(db.scalars(select(Student).where(Student.id.in_(student_ids))))
    students_by_id = {student.id: student for student in students}
    missing_ids = [student_id for student_id in student_ids if student_id not in students_by_id]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Students not found: {missing_ids}")

    invalid_ids = [student.id for student in students if student.group_id != payload.group_id]
    if invalid_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Students are outside this group: {invalid_ids}")

    existing_rows = list(
        db.scalars(
            select(AttendanceTable).where(
                AttendanceTable.group_id == payload.group_id,
                AttendanceTable.date == attendance_date,
                AttendanceTable.student_id.in_(student_ids),
            )
        )
    )
    existing_by_student = {row.student_id: row for row in existing_rows}
    saved_rows: list[AttendanceTable] = []
    previous_grades: dict[int, int | None] = {}

    try:
        for item in payload.items:
            row = existing_by_student.get(item.student_id)
            if row is None:
                previous_grades[item.student_id] = None
                row = AttendanceTable(
                    student_id=item.student_id,
                    lesson_id=payload.lesson_id,
                    group_id=payload.group_id,
                    teacher_id=current_user.teacher_id,
                    date=attendance_date,
                    status=item.status,
                    grade=item.grade,
                    reason=item.reason,
                    note=item.note,
                )
            else:
                previous_grades[item.student_id] = row.grade
                row.lesson_id = payload.lesson_id
                row.group_id = payload.group_id
                row.teacher_id = current_user.teacher_id
                row.date = attendance_date
                row.status = item.status
                row.grade = item.grade
                row.reason = item.reason
                row.note = item.note
            db.add(row)
            saved_rows.append(row)

        db.commit()
        for row in saved_rows:
            db.refresh(row)
            send_attendance_notification(db, row.student_id, row.status, row.date, row.note)
            notify_bad_grade_for_attendance(db, row, previous_grade=previous_grades.get(row.student_id))
        return saved_rows
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("/attendance", response_model=list[AttendanceRead])
def my_attendance(
    db: SessionDep,
    current_user: TeacherUser,
    group_id: int | None = None,
    attendance_date: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AttendanceRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if group_id is not None:
        if group_id not in group_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is outside your access")
        group_ids = [group_id]
    if not group_ids:
        return []
    query = select(AttendanceTable).where(AttendanceTable.group_id.in_(group_ids)).offset(skip).limit(limit).order_by(AttendanceTable.created_at.desc())
    if attendance_date:
        query = query.where(AttendanceTable.date == attendance_date)
    return list(db.scalars(query))


@router.put("/attendance/{attendance_id}", response_model=AttendanceRead)
def update_my_attendance(attendance_id: int, payload: AttendanceUpdate, db: SessionDep, current_user: TeacherUser) -> AttendanceRead:
    attendance = db.get(AttendanceTable, attendance_id)
    if not attendance:
        raise not_found("Attendance")
    if attendance.group_id not in teacher_group_ids(db, current_user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attendance is outside your groups")
    previous_grade = attendance.grade
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    updated = attendance
    send_attendance_notification(db, updated.student_id, updated.status, updated.date, updated.note)
    notify_bad_grade_for_attendance(db, updated, previous_grade=previous_grade)
    return updated


@router.post("/homework", response_model=HomeworkRead)
def create_my_homework(payload: HomeworkCreate, db: SessionDep, current_user: TeacherUser) -> HomeworkRead:
    if payload.group_id not in teacher_group_ids(db, current_user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Homework group is outside your access")
    homework = Homework(
        title=payload.title,
        description=payload.description,
        group_id=payload.group_id,
        teacher_id=current_user.teacher_id or 0,
        due_date=payload.due_date,
        is_active=payload.is_active,
    )
    db.add(homework)
    db.commit()
    db.refresh(homework)
    return homework


@router.get("/homework", response_model=list[HomeworkRead])
def my_homework(db: SessionDep, current_user: TeacherUser, group_id: int | None = None) -> list[HomeworkRead]:
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if group_id is not None:
        if group_id not in group_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is outside your access")
        group_ids = [group_id]
    if not group_ids:
        return []
    return list(db.scalars(select(Homework).where(Homework.group_id.in_(group_ids)).order_by(Homework.created_at.desc())))


@router.post("/homework/status", response_model=HomeworkStatusRead)
def mark_my_homework_status(payload: HomeworkStatusUpsert, db: SessionDep, current_user: TeacherUser) -> HomeworkStatusRead:
    homework = db.get(Homework, payload.homework_id)
    student = db.get(Student, payload.student_id)
    group_ids = teacher_group_ids(db, current_user.teacher_id or 0)
    if not homework:
        raise not_found("Homework")
    if not student:
        raise not_found("Student")
    if homework.group_id not in group_ids or student.group_id != homework.group_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Homework status is outside your groups")
    status_row = db.scalar(
        select(HomeworkStatus).where(HomeworkStatus.homework_id == payload.homework_id, HomeworkStatus.student_id == payload.student_id)
    )
    if status_row is None:
        status_row = HomeworkStatus(**payload.model_dump(exclude_none=True))
    else:
        status_row.is_completed = payload.is_completed
        status_row.note = payload.note
    db.add(status_row)
    db.commit()
    db.refresh(status_row)
    notify_homework_missing(db, status_row)
    return status_row


@router.post("/students/{student_id}/notify-parent", response_model=dict[str, object])
def notify_student_parent(
    student_id: int,
    payload: dict[str, object],
    db: SessionDep,
    current_user: TeacherUser,
) -> dict[str, object]:
    student = db.get(Student, student_id)
    if not student:
        raise not_found("Student")
    if student.group_id not in teacher_group_ids(db, current_user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is outside your groups")

    notification_type = str(payload.get("type") or "").strip()
    if notification_type not in {"absent", "late"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="type must be absent or late")

    attendance_date = payload.get("date")
    if isinstance(attendance_date, str) and attendance_date:
        attendance_date = date.fromisoformat(attendance_date)
    elif attendance_date is None:
        attendance_date = date.today()
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date must be ISO formatted")

    note = payload.get("note")
    if note is not None and not isinstance(note, str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="note must be a string")

    sent = send_attendance_notification(db, student_id, notification_type, attendance_date, note)
    return {
        "ok": True,
        "sent_count": len(sent),
        "type": notification_type,
        "date": attendance_date.isoformat(),
    }
