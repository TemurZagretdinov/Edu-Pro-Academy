from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, SessionDep
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.crud import user as user_crud
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, CreateTeacherUserRequest, LoginRequest, MessageResponse, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.utils.helpers import conflict_from_integrity_error

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: SessionDep) -> TokenResponse:
    user = user_crud.get_user_by_email(db, payload.email)
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    student_id = None
    if user.role == "student":
        student = db.scalar(select(Student).where(Student.user_id == user.id, Student.is_active.is_(True)))
        if not student:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student profile is not linked or inactive")
        student_id = student.id
    token = create_access_token(subject=str(user.id), role=user.role)
    user_read = UserRead.model_validate(user)
    user_read.student_id = student_id
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        teacher_id=user.teacher_id,
        student_id=student_id,
        full_name=user.full_name,
        user=user_read,
    )


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser, db: SessionDep) -> UserRead:
    user_read = UserRead.model_validate(current_user)
    if current_user.role == "student":
        student = db.scalar(select(Student).where(Student.user_id == current_user.id))
        user_read.student_id = student.id if student else None
    return user_read


@router.post("/change-password", response_model=MessageResponse)
def change_password(payload: ChangePasswordRequest, current_user: CurrentUser, db: SessionDep) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Joriy parol noto'g'ri")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Yangi parol joriy parol bilan bir xil bo'lmasligi kerak")
    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return MessageResponse(message="Parol muvaffaqiyatli o'zgartirildi ✅")


@router.post("/bootstrap-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(db: SessionDep) -> UserRead:
    existing_admin = db.scalar(select(User).where(User.role == "admin").limit(1))
    if existing_admin:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Admin already exists")

    existing_users = db.scalar(select(func.count(User.id))) or 0
    if existing_users:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bootstrap is available only before users exist")
    if len(settings.bootstrap_admin_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BOOTSTRAP_ADMIN_PASSWORD must be at least 6 characters",
        )
    try:
        return user_crud.create_user(
            db,
            UserCreate(
                email=settings.bootstrap_admin_email,
                full_name="System Admin",
                password=settings.bootstrap_admin_password,
                role="admin",
            ),
        )
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.post("/create-teacher-user", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_teacher_user(payload: CreateTeacherUserRequest, db: SessionDep, _admin: AdminUser) -> UserRead:
    teacher = db.get(Teacher, payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    if user_crud.get_user_by_teacher_id(db, teacher.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher user already exists")

    email = payload.email or teacher.email
    if user_crud.get_user_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    try:
        return user_crud.create_user(
            db,
            UserCreate(
                email=email,
                full_name=payload.full_name or teacher.name,
                password=payload.password,
                role="teacher",
                teacher_id=teacher.id,
            ),
        )
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)
