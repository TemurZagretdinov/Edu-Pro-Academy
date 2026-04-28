from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.student import Student
from app.models.user import User

SessionDep = Annotated[Session, Depends(get_db)]
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(db: SessionDep, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_admin(current_user: CurrentUser) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def get_current_teacher(current_user: CurrentUser) -> User:
    if current_user.role != "teacher" or current_user.teacher_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")
    return current_user


def get_current_admin_or_teacher(current_user: CurrentUser) -> User:
    if current_user.role not in {"admin", "teacher"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Valid role required")
    return current_user


def get_current_student(db: SessionDep, current_user: CurrentUser) -> Student:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    student = db.query(Student).filter(Student.user_id == current_user.id, Student.is_active.is_(True)).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile is not linked or inactive")
    return student


require_admin = get_current_admin
require_teacher = get_current_teacher
require_admin_or_teacher = get_current_admin_or_teacher

AdminUser = Annotated[User, Depends(get_current_admin)]
TeacherUser = Annotated[User, Depends(get_current_teacher)]
StudentUser = Annotated[Student, Depends(get_current_student)]
AdminOrTeacherUser = Annotated[User, Depends(get_current_admin_or_teacher)]
