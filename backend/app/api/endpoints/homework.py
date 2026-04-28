from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminOrTeacherUser, AdminUser, SessionDep
from app.models.group import Group, GroupTeacher
from app.models.homework import Homework, HomeworkStatus
from app.models.student import Student
from app.schemas.homework import HomeworkCreate, HomeworkRead, HomeworkStatusRead, HomeworkStatusUpsert, HomeworkUpdate
from app.services.parent_notifications import notify_homework_missing
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


def _teacher_group_ids(db: SessionDep, teacher_id: int) -> list[int]:
    return list(
        db.scalars(
            select(Group.id)
            .outerjoin(GroupTeacher, GroupTeacher.group_id == Group.id)
            .where(or_(Group.teacher_id == teacher_id, GroupTeacher.teacher_id == teacher_id))
            .distinct()
        )
    )


def _ensure_homework_access(db: SessionDep, user: AdminOrTeacherUser, homework: Homework) -> None:
    if user.role == "admin":
        return
    if homework.group_id not in _teacher_group_ids(db, user.teacher_id or 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This homework is outside your groups")


@router.post("", response_model=HomeworkRead, status_code=status.HTTP_201_CREATED)
def create_homework(payload: HomeworkCreate, db: SessionDep, user: AdminOrTeacherUser) -> HomeworkRead:
    teacher_id = payload.teacher_id if user.role == "admin" else user.teacher_id
    if teacher_id is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="teacher_id is required")
    if user.role == "teacher" and payload.group_id not in _teacher_group_ids(db, teacher_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can create homework only for your groups")
    homework = Homework(
        title=payload.title,
        description=payload.description,
        group_id=payload.group_id,
        teacher_id=teacher_id,
        due_date=payload.due_date,
        is_active=payload.is_active,
    )
    try:
        db.add(homework)
        db.commit()
        db.refresh(homework)
        return homework
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[HomeworkRead])
def list_homework(
    db: SessionDep,
    user: AdminOrTeacherUser,
    group_id: int | None = None,
    is_active: bool | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[HomeworkRead]:
    query = select(Homework).offset(skip).limit(limit).order_by(Homework.created_at.desc())
    if group_id is not None:
        query = query.where(Homework.group_id == group_id)
    if is_active is not None:
        query = query.where(Homework.is_active == is_active)
    if user.role == "teacher":
        group_ids = _teacher_group_ids(db, user.teacher_id or 0)
        if not group_ids:
            return []
        query = query.where(Homework.group_id.in_(group_ids))
    return list(db.scalars(query))


@router.put("/{homework_id}", response_model=HomeworkRead)
def update_homework(homework_id: int, payload: HomeworkUpdate, db: SessionDep, user: AdminOrTeacherUser) -> HomeworkRead:
    homework = db.get(Homework, homework_id)
    if not homework:
        raise not_found("Homework")
    _ensure_homework_access(db, user, homework)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(homework, field, value)
    db.add(homework)
    db.commit()
    db.refresh(homework)
    return homework


@router.post("/status", response_model=HomeworkStatusRead)
def upsert_homework_status(payload: HomeworkStatusUpsert, db: SessionDep, user: AdminOrTeacherUser) -> HomeworkStatusRead:
    homework = db.get(Homework, payload.homework_id)
    student = db.get(Student, payload.student_id)
    if not homework:
        raise not_found("Homework")
    if not student:
        raise not_found("Student")
    _ensure_homework_access(db, user, homework)
    if user.role == "teacher" and student.group_id != homework.group_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is outside this homework group")
    status_row = db.scalar(
        select(HomeworkStatus).where(
            HomeworkStatus.homework_id == payload.homework_id,
            HomeworkStatus.student_id == payload.student_id,
        )
    )
    if status_row is None:
        status_row = HomeworkStatus(**payload.model_dump(exclude_none=True))
    else:
        status_row.is_completed = payload.is_completed
        status_row.note = payload.note
    if payload.is_completed and status_row.submitted_at is None:
        status_row.submitted_at = datetime.now(timezone.utc)
    db.add(status_row)
    db.commit()
    db.refresh(status_row)
    notify_homework_missing(db, status_row)
    return status_row


@router.get("/status", response_model=list[HomeworkStatusRead])
def list_homework_statuses(
    db: SessionDep,
    user: AdminOrTeacherUser,
    homework_id: int | None = None,
    student_id: int | None = None,
) -> list[HomeworkStatusRead]:
    query = select(HomeworkStatus).join(Homework, Homework.id == HomeworkStatus.homework_id)
    if homework_id is not None:
        query = query.where(HomeworkStatus.homework_id == homework_id)
    if student_id is not None:
        query = query.where(HomeworkStatus.student_id == student_id)
    if user.role == "teacher":
        group_ids = _teacher_group_ids(db, user.teacher_id or 0)
        if not group_ids:
            return []
        query = query.where(Homework.group_id.in_(group_ids))
    return list(db.scalars(query.order_by(HomeworkStatus.id.desc())))


@router.get("/analytics", response_model=dict[str, float | int])
def homework_analytics(db: SessionDep, _admin: AdminUser) -> dict[str, float | int]:
    total = db.scalar(select(func.count(HomeworkStatus.id))) or 0
    completed = db.scalar(select(func.count(HomeworkStatus.id)).where(HomeworkStatus.is_completed.is_(True))) or 0
    percent = round((completed / total) * 100, 1) if total else 0.0
    return {"total": total, "completed": completed, "completion_percent": percent}
