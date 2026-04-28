from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, SessionDep
from app.crud import group as group_crud
from app.crud import teacher as teacher_crud
from app.models.group import GroupTeacher
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.time_month import TimeMonthTable
from app.schemas.group import GroupAssignTeacherRequest, GroupCreate, GroupRead, GroupStudentInfo, GroupStudentsRequest, GroupTeacherInfo, GroupTeacherRead, GroupUpdate
from app.schemas.student import StudentListItem, StudentRead
from app.schemas.teacher import TeacherRead
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


def _latest_monthly_fee(db: SessionDep, group_id: int):
    return db.scalar(
        select(TimeMonthTable.price)
        .where(TimeMonthTable.group_id == group_id)
        .order_by(TimeMonthTable.datetime.desc(), TimeMonthTable.id.desc())
        .limit(1)
    )


def _set_monthly_fee(db: SessionDep, group_id: int, monthly_fee) -> None:
    if monthly_fee is None:
        return
    db.add(TimeMonthTable(group_id=group_id, price=monthly_fee, datetime=datetime.now(timezone.utc)))
    db.commit()


def _group_read(db: SessionDep, group, include_students: bool = False) -> GroupRead:
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
        room=group.room,
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
        monthly_fee=_latest_monthly_fee(db, group.id),
    )


def _validate_teacher(db: SessionDep, teacher_id: int) -> Teacher:
    teacher = teacher_crud.get_teacher(db, teacher_id)
    if not teacher:
        raise not_found("Teacher")
    return teacher


def _validate_students(db: SessionDep, student_ids: list[int]) -> list[Student]:
    unique_ids = list(dict.fromkeys(student_ids))
    students = list(db.scalars(select(Student).where(Student.id.in_(unique_ids))))
    found_ids = {student.id for student in students}
    missing_ids = [student_id for student_id in unique_ids if student_id not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Students not found: {missing_ids}")
    inactive_ids = [student.id for student in students if not student.is_active]
    if inactive_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Inactive students cannot be added: {inactive_ids}")
    assigned_ids = [student.id for student in students if student.group_id is not None]
    if assigned_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Students already belong to another group: {assigned_ids}")
    return students


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, db: SessionDep, _admin: AdminUser) -> GroupRead:
    if payload.teacher_id is not None:
        _validate_teacher(db, payload.teacher_id)
    try:
        group = group_crud.create_group(db, payload)
        _set_monthly_fee(db, group.id, payload.monthly_fee)
        db.refresh(group)
        return _group_read(db, group)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[GroupRead])
def list_groups(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    is_active: bool | None = None,
    q: str | None = None,
) -> list[GroupRead]:
    return [_group_read(db, group) for group in group_crud.list_groups(db, skip=skip, limit=limit, is_active=is_active, q=q)]


@router.get("/unassigned-students", response_model=list[StudentListItem])
def list_unassigned_students(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    is_active: bool | None = None,
    q: str | None = None,
) -> list[StudentListItem]:
    query = select(Student).where(Student.group_id.is_(None))
    if is_active is not None:
        query = query.where(Student.is_active.is_(is_active))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(
            (Student.firstname.ilike(pattern))
            | (Student.lastname.ilike(pattern))
            | (Student.phone_number.ilike(pattern))
            | (Student.email.ilike(pattern))
        )
    query = query.order_by(Student.lastname, Student.firstname).offset(skip).limit(limit)
    return list(db.scalars(query))


@router.get("/{group_id}", response_model=GroupRead)
def get_group(group_id: int, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    return _group_read(db, group, include_students=True)


@router.put("/{group_id}", response_model=GroupRead)
def update_group(group_id: int, payload: GroupUpdate, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    update_data = payload.model_dump(exclude_unset=True)
    if "teacher_id" in update_data and update_data["teacher_id"] is not None:
        _validate_teacher(db, update_data["teacher_id"])
    try:
        updated = group_crud.update_group(db, group, payload)
        _set_monthly_fee(db, updated.id, payload.monthly_fee)
        db.refresh(updated)
        if "teacher_id" in update_data:
            db.query(Student).filter(Student.group_id == updated.id).update(
                {Student.teacher_id: update_data["teacher_id"]},
                synchronize_session=False,
            )
            db.commit()
            db.refresh(updated)
        return _group_read(db, updated)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: SessionDep, _admin: AdminUser) -> Response:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    db.query(Student).filter(Student.group_id == group_id).update(
        {Student.group_id: None, Student.teacher_id: None},
        synchronize_session=False,
    )
    db.delete(group)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{group_id}/activate", response_model=GroupRead)
def activate_group(group_id: int, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    return _group_read(db, group_crud.set_group_active(db, group, True))


@router.patch("/{group_id}/deactivate", response_model=GroupRead)
def deactivate_group(group_id: int, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    return _group_read(db, group_crud.set_group_active(db, group, False))


@router.put("/{group_id}/assign-teacher", response_model=GroupRead)
def assign_teacher(group_id: int, payload: GroupAssignTeacherRequest, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    teacher = _validate_teacher(db, payload.teacher_id)
    try:
        return _group_read(db, group_crud.assign_teacher(db, group, teacher), include_students=True)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.put("/{group_id}/add-students", response_model=GroupRead)
def add_students(group_id: int, payload: GroupStudentsRequest, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    if not group.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu guruh nofaol. Avval guruhni faollashtiring.")
    students = _validate_students(db, payload.student_ids)
    return _group_read(db, group_crud.add_students(db, group, students), include_students=True)


@router.put("/{group_id}/remove-student/{student_id}", response_model=GroupRead)
def remove_student(group_id: int, student_id: int, db: SessionDep, _admin: AdminUser) -> GroupRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    student = db.get(Student, student_id)
    if not student:
        raise not_found("Student")
    if student.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student is not in this group")
    return _group_read(db, group_crud.remove_student(db, group, student), include_students=True)


@router.post("/{group_id}/teachers/{teacher_id}", response_model=GroupTeacherRead, status_code=status.HTTP_201_CREATED)
def assign_teacher_to_group(group_id: int, teacher_id: int, db: SessionDep, _admin: AdminUser) -> GroupTeacherRead:
    group = group_crud.get_group(db, group_id)
    if not group:
        raise not_found("Group")
    teacher = _validate_teacher(db, teacher_id)
    group_crud.assign_teacher(db, group, teacher)
    link = db.scalar(select(GroupTeacher).where(GroupTeacher.group_id == group_id, GroupTeacher.teacher_id == teacher_id))
    if not link:
        raise not_found("Group teacher assignment")
    return link


@router.delete("/{group_id}/teachers/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_teacher_from_group(group_id: int, teacher_id: int, db: SessionDep, _admin: AdminUser) -> Response:
    removed = group_crud.remove_teacher(db, group_id=group_id, teacher_id=teacher_id)
    if not removed:
        raise not_found("Group teacher assignment")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{group_id}/students", response_model=list[StudentRead])
def list_group_students(group_id: int, db: SessionDep, _admin: AdminUser) -> list[StudentRead]:
    if not group_crud.get_group(db, group_id):
        raise not_found("Group")
    return list(db.scalars(select(Student).where(Student.group_id == group_id).order_by(Student.lastname)))


@router.get("/{group_id}/teachers", response_model=list[TeacherRead])
def list_group_teachers(group_id: int, db: SessionDep, _admin: AdminUser) -> list[TeacherRead]:
    if not group_crud.get_group(db, group_id):
        raise not_found("Group")
    return list(
        db.scalars(
            select(Teacher)
            .join(GroupTeacher, GroupTeacher.teacher_id == Teacher.id)
            .where(GroupTeacher.group_id == group_id)
            .order_by(Teacher.name)
        )
    )
