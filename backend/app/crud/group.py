from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.group import Group, GroupTeacher
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.group import GroupCreate, GroupUpdate


def get_group(db: Session, group_id: int) -> Group | None:
    return db.get(Group, group_id)


def list_groups(db: Session, skip: int = 0, limit: int = 100, is_active: bool | None = None, q: str | None = None) -> list[Group]:
    query = select(Group)
    if is_active is not None:
        query = query.where(Group.is_active == is_active)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Group.name.ilike(pattern), Group.course_name.ilike(pattern), Group.level.ilike(pattern), Group.room.ilike(pattern)))
    query = query.order_by(Group.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_group(db: Session, payload: GroupCreate) -> Group:
    group = Group(**payload.model_dump(exclude={"monthly_fee"}))
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def update_group(db: Session, group: Group, payload: GroupUpdate) -> Group:
    for field, value in payload.model_dump(exclude_unset=True, exclude={"monthly_fee"}).items():
        setattr(group, field, value)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def set_group_active(db: Session, group: Group, is_active: bool) -> Group:
    group.is_active = is_active
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def assign_teacher(db: Session, group: Group, teacher: Teacher) -> Group:
    group.teacher_id = teacher.id
    db.add(group)
    db.query(GroupTeacher).filter(
        GroupTeacher.group_id == group.id,
        GroupTeacher.teacher_id != teacher.id,
    ).delete(synchronize_session=False)
    db.query(Student).filter(Student.group_id == group.id).update(
        {Student.teacher_id: teacher.id},
        synchronize_session=False,
    )
    existing = db.scalar(
        select(GroupTeacher).where(GroupTeacher.group_id == group.id, GroupTeacher.teacher_id == teacher.id)
    )
    if existing:
        db.commit()
        db.refresh(group)
        return group
    link = GroupTeacher(group_id=group.id, teacher_id=teacher.id)
    db.add(link)
    db.commit()
    db.refresh(group)
    return group


def add_students(db: Session, group: Group, students: list[Student]) -> Group:
    for student in students:
        student.group_id = group.id
        student.teacher_id = group.teacher_id
        db.add(student)
    db.commit()
    db.refresh(group)
    return group


def remove_student(db: Session, group: Group, student: Student) -> Group:
    student.group_id = None
    if group.teacher_id is not None and student.teacher_id == group.teacher_id:
        student.teacher_id = None
    db.add(student)
    db.commit()
    db.refresh(group)
    return group


def remove_teacher(db: Session, group_id: int, teacher_id: int) -> bool:
    link = db.scalar(select(GroupTeacher).where(GroupTeacher.group_id == group_id, GroupTeacher.teacher_id == teacher_id))
    if not link:
        return False
    db.delete(link)
    group = db.get(Group, group_id)
    if group and group.teacher_id == teacher_id:
        group.teacher_id = None
        db.add(group)
        db.query(Student).filter(Student.group_id == group_id).update(
            {Student.teacher_id: None},
            synchronize_session=False,
        )
    db.commit()
    return True
