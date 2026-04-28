from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    return db.scalar(select(User).where(func.lower(User.email) == normalized_email))


def get_user_by_teacher_id(db: Session, teacher_id: int) -> User | None:
    return db.scalar(select(User).where(User.teacher_id == teacher_id))


def get_user_by_student_id(db: Session, student_id: int) -> User | None:
    from app.models.student import Student

    return db.scalar(select(User).join(Student, Student.user_id == User.id).where(Student.id == student_id))


def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit).order_by(User.id.desc())))


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
        teacher_id=payload.teacher_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
