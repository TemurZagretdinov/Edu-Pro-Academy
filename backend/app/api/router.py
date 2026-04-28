from fastapi import APIRouter

from app.api.endpoints import attendance, auth, dashboard, groups, homework, lessons, notifications, parents, payments, student_portal, students, teacher_panel, teachers

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(parents.router, prefix="/parents", tags=["parents"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
api_router.include_router(homework.router, prefix="/homework", tags=["homework"])
api_router.include_router(teacher_panel.router, prefix="/teacher", tags=["teacher-panel"])
api_router.include_router(student_portal.router, prefix="/student", tags=["student-portal"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
