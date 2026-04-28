"""Seed demo data for the read-only student portal.

Run from the backend directory:
    python scripts/seed_student_portal_demo.py
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.attendance import AttendanceTable
from app.models.group import Group, GroupTeacher
from app.models.group_schedule import GroupSchedule
from app.models.payment import Payment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.time_month import TimeMonthTable
from app.models.user import User


STUDENT_EMAIL = "ali@example.com"
STUDENT_PASSWORD = "12345678"
TEACHER_EMAIL = "jasur@example.com"
MONTHLY_FEE = Decimal("350000")


def main() -> None:
    db = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.email == TEACHER_EMAIL).first()
        if teacher is None:
            teacher = Teacher(name="Jasur Karimov", email=TEACHER_EMAIL, phone_number="+998901112233")
        else:
            teacher.name = "Jasur Karimov"
            teacher.phone_number = teacher.phone_number or "+998901112233"
        db.add(teacher)
        db.flush()

        group = db.query(Group).filter(Group.name == "Frontend N12").first()
        if group is None:
            group = Group(name="Frontend N12")
        group.course_name = "Frontend"
        group.level = "N12"
        group.start_date = date(2026, 2, 1)
        group.end_date = date(2026, 6, 30)
        group.lesson_days = "Dushanba, Chorshanba, Juma"
        group.lesson_time = time(14, 0)
        group.teacher_id = teacher.id
        group.is_active = True
        db.add(group)
        db.flush()

        link = db.query(GroupTeacher).filter(GroupTeacher.group_id == group.id, GroupTeacher.teacher_id == teacher.id).first()
        if link is None:
            db.add(GroupTeacher(group_id=group.id, teacher_id=teacher.id))

        user = db.query(User).filter(User.email == STUDENT_EMAIL).first()
        if user is None:
            user = User(
                email=STUDENT_EMAIL,
                full_name="Ali Valiyev",
                password_hash=hash_password(STUDENT_PASSWORD),
                role="student",
                is_active=True,
            )
        else:
            user.full_name = "Ali Valiyev"
            user.password_hash = hash_password(STUDENT_PASSWORD)
            user.role = "student"
            user.is_active = True
        db.add(user)
        db.flush()

        student = db.query(Student).filter(Student.email == STUDENT_EMAIL).first()
        if student is None:
            student = Student(
                firstname="Ali",
                lastname="Valiyev",
                phone_number="+998901234567",
                email=STUDENT_EMAIL,
            )
        student.firstname = "Ali"
        student.lastname = "Valiyev"
        student.phone_number = student.phone_number or "+998901234567"
        student.parent_phone_number = "+998909876543"
        student.group_id = group.id
        student.teacher_id = teacher.id
        student.user_id = user.id
        student.registration_date = date(2026, 2, 1)
        student.is_active = True
        student.trial_lesson_status = "joined"
        db.add(student)
        db.flush()

        db.query(GroupSchedule).filter(GroupSchedule.group_id == group.id).delete(synchronize_session=False)
        db.add_all(
            [
                GroupSchedule(group_id=group.id, day_of_week="Dushanba", start_time=time(14, 0), end_time=time(16, 0), subject_name="React TypeScript", room="201"),
                GroupSchedule(group_id=group.id, day_of_week="Chorshanba", start_time=time(14, 0), end_time=time(16, 0), subject_name="JavaScript", room="201"),
                GroupSchedule(group_id=group.id, day_of_week="Juma", start_time=time(14, 0), end_time=time(16, 0), subject_name="Tailwind CSS", room="201"),
            ]
        )

        db.query(TimeMonthTable).filter(TimeMonthTable.group_id == group.id).delete(synchronize_session=False)
        db.add_all(
            [
                TimeMonthTable(group_id=group.id, datetime=datetime(2026, 2, 1, tzinfo=timezone.utc), price=MONTHLY_FEE),
                TimeMonthTable(group_id=group.id, datetime=datetime(2026, 3, 1, tzinfo=timezone.utc), price=MONTHLY_FEE),
                TimeMonthTable(group_id=group.id, datetime=datetime(2026, 4, 1, tzinfo=timezone.utc), price=MONTHLY_FEE),
            ]
        )

        db.query(AttendanceTable).filter(AttendanceTable.student_id == student.id).delete(synchronize_session=False)
        db.add_all(
            [
                AttendanceTable(student_id=student.id, group_id=group.id, teacher_id=teacher.id, date=date(2026, 4, 1), status="present", note="Darsda qatnashdi"),
                AttendanceTable(student_id=student.id, group_id=group.id, teacher_id=teacher.id, date=date(2026, 4, 3), status="present", note="Faol qatnashdi"),
                AttendanceTable(student_id=student.id, group_id=group.id, teacher_id=teacher.id, date=date(2026, 4, 5), status="late", note="10 daqiqa kechikdi"),
                AttendanceTable(student_id=student.id, group_id=group.id, teacher_id=teacher.id, date=date(2026, 4, 8), status="absent", note="Sababsiz kelmadi"),
            ]
        )

        db.query(Payment).filter(Payment.student_id == student.id).delete(synchronize_session=False)
        db.add_all(
            [
                Payment(student_id=student.id, amount=MONTHLY_FEE, payment_date=date(2026, 2, 3), paid_for_month=date(2026, 2, 1), status="paid", note="Fevral uchun naqd"),
                Payment(student_id=student.id, amount=MONTHLY_FEE, payment_date=date(2026, 3, 4), paid_for_month=date(2026, 3, 1), status="paid", note="Mart uchun karta"),
                Payment(student_id=student.id, amount=Decimal("150000"), payment_date=date(2026, 4, 1), paid_for_month=date(2026, 4, 1), status="partial", note="Aprel uchun qisman to'lov"),
            ]
        )

        db.commit()
        print("Student portal demo data created.")
        print(f"Student login: {STUDENT_EMAIL} / {STUDENT_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
