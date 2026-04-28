from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, SessionDep
from app.crud import teacher as teacher_crud
from app.crud import user as user_crud
from app.schemas.teacher import TeacherCreate, TeacherRead, TeacherUpdate
from app.schemas.user import UserCreate
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


@router.post("", response_model=TeacherRead, status_code=status.HTTP_201_CREATED)
def create_teacher(payload: TeacherCreate, db: SessionDep, _admin: AdminUser) -> TeacherRead:
    if payload.password and user_crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    try:
        teacher = teacher_crud.create_teacher(db, payload)
        if payload.password:
            user_crud.create_user(
                db,
                UserCreate(
                    email=payload.email,
                    full_name=payload.name,
                    password=payload.password,
                    role="teacher",
                    teacher_id=teacher.id,
                ),
            )
        return teacher
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[TeacherRead])
def list_teachers(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[TeacherRead]:
    return teacher_crud.list_teachers(db, skip=skip, limit=limit)


@router.get("/{teacher_id}", response_model=TeacherRead)
def get_teacher(teacher_id: int, db: SessionDep, _admin: AdminUser) -> TeacherRead:
    teacher = teacher_crud.get_teacher(db, teacher_id)
    if not teacher:
        raise not_found("Teacher")
    return teacher


@router.put("/{teacher_id}", response_model=TeacherRead)
def update_teacher(teacher_id: int, payload: TeacherUpdate, db: SessionDep, _admin: AdminUser) -> TeacherRead:
    teacher = teacher_crud.get_teacher(db, teacher_id)
    if not teacher:
        raise not_found("Teacher")
    try:
        return teacher_crud.update_teacher(db, teacher, payload)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(teacher_id: int, db: SessionDep, _admin: AdminUser) -> Response:
    teacher = teacher_crud.get_teacher(db, teacher_id)
    if not teacher:
        raise not_found("Teacher")
    teacher_crud.delete_teacher(db, teacher)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
