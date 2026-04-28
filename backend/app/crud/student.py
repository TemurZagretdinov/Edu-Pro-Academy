from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.passport import Passport
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def get_student(db: Session, student_id: int) -> Student | None:
    return db.scalar(select(Student).options(selectinload(Student.passport)).where(Student.id == student_id))


def list_students(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    group_id: int | None = None,
    is_active: bool | None = None,
    q: str | None = None,
) -> list[Student]:
    query = select(Student).options(selectinload(Student.passport))
    if group_id is not None:
        query = query.where(Student.group_id == group_id)
    if is_active is not None:
        query = query.where(Student.is_active.is_(is_active))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Student.firstname.ilike(pattern),
                Student.lastname.ilike(pattern),
                Student.phone_number.ilike(pattern),
                Student.email.ilike(pattern),
                Student.address.ilike(pattern),
                Student.comment.ilike(pattern),
                Student.trial_lesson_status.ilike(pattern),
            )
        )
    query = query.order_by(Student.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_student(db: Session, payload: StudentCreate) -> Student:
    student = Student(**payload.model_dump(exclude={"passport", "password", "group_id", "teacher_id"}, exclude_none=True))
    if payload.passport:
        student.passport = Passport(**payload.passport.model_dump(exclude_none=True))
    db.add(student)
    db.commit()
    db.refresh(student)
    return get_student(db, student.id) or student


def update_student(db: Session, student: Student, payload: StudentUpdate) -> Student:
    for field, value in payload.model_dump(exclude_unset=True, exclude={"passport", "group_id", "teacher_id"}).items():
        setattr(student, field, value)
    if payload.passport is not None:
        passport_data = payload.passport.model_dump(exclude_unset=True)
        if student.passport is None:
            student.passport = Passport(**passport_data)
        else:
            for field, value in passport_data.items():
                setattr(student.passport, field, value)
    db.add(student)
    db.commit()
    db.refresh(student)
    return get_student(db, student.id) or student


def delete_student(db: Session, student: Student) -> None:
    student.is_active = False
    db.add(student)
    db.commit()
