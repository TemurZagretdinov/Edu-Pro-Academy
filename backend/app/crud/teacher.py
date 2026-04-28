from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.teacher import Teacher
from app.schemas.teacher import TeacherCreate, TeacherUpdate


def get_teacher(db: Session, teacher_id: int) -> Teacher | None:
    return db.get(Teacher, teacher_id)


def list_teachers(db: Session, skip: int = 0, limit: int = 100) -> list[Teacher]:
    return list(db.scalars(select(Teacher).offset(skip).limit(limit).order_by(Teacher.id.desc())))


def create_teacher(db: Session, payload: TeacherCreate) -> Teacher:
    teacher = Teacher(**payload.model_dump(exclude={"password"}))
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


def update_teacher(db: Session, teacher: Teacher, payload: TeacherUpdate) -> Teacher:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


def delete_teacher(db: Session, teacher: Teacher) -> None:
    db.delete(teacher)
    db.commit()
