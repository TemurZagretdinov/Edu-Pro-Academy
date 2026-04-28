from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, SessionDep
from app.crud import payment as payment_crud
from app.crud import student as student_crud
from app.crud import user as user_crud
from app.core.security import hash_password
from app.models.attendance import AttendanceTable
from app.models.group import Group
from app.models.parent import Parent, ParentConnectionCode, ParentStudentLink
from app.models.student import Student
from app.models.user import User
from app.services.parent_notifications import create_parent_connection_code, link_parent_to_student
from app.schemas.attendance import AttendanceRead
from app.schemas.parent import ParentConnectionCodeRead, ParentStudentLinkCreate, ParentStudentLinkRead
from app.schemas.payment import PaymentRead
from app.schemas.student import GroupSummaryRead, ParentLinkStatusRead, StudentApproveRequest, StudentApproveResponse, StudentCreate, StudentListItem, StudentRead, StudentRejectRequest, StudentSummary, StudentUpdate
from app.schemas.user import UserCreate
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()
DEFAULT_STUDENT_PASSWORD = "12345678"


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _group_summary(group: Group | None) -> GroupSummaryRead | None:
    if group is None:
        return None
    return GroupSummaryRead(
        id=group.id,
        name=group.name,
        teacher_id=group.teacher_id,
        teacher_name=group.teacher.name if group.teacher else None,
        students_count=len(group.students),
        is_active=group.is_active,
    )


def _student_parent_links(db: SessionDep, student_id: int) -> list[ParentStudentLink]:
    return list(
        db.scalars(
            select(ParentStudentLink)
            .options(selectinload(ParentStudentLink.parent))
            .where(ParentStudentLink.student_id == student_id)
            .order_by(ParentStudentLink.id.desc())
        )
    )


def _active_parent_code(db: SessionDep, student_id: int) -> ParentConnectionCode | None:
    now = datetime.now(timezone.utc)
    codes = db.scalars(
        select(ParentConnectionCode)
        .where(
            ParentConnectionCode.student_id == student_id,
            ParentConnectionCode.is_used.is_(False),
        )
        .order_by(ParentConnectionCode.created_at.desc(), ParentConnectionCode.id.desc())
    )
    for code in codes:
        if code.expires_at is None or _as_aware(code.expires_at) >= now:
            return code
    return None


def _build_approve_response(
    db: SessionDep,
    student: Student,
    *,
    group: Group | None = None,
    parent_code: ParentConnectionCode | None = None,
    user: User | None = None,
    account_warning: str | None = None,
) -> StudentApproveResponse:
    links = _student_parent_links(db, student.id)
    return StudentApproveResponse(
        student=student,
        group=_group_summary(group or student.group),
        parent_connection_code=parent_code,
        parent_links=links,
        parent_connected=any(bool(link.parent and link.parent.is_connected) for link in links),
        application_status=student.trial_lesson_status,
        user_id=user.id if user else student.user_id,
        email=user.email if user else student.email,
        default_password=DEFAULT_STUDENT_PASSWORD if (user or student.user_id) else None,
        account_warning=account_warning,
    )


def _ensure_student_user(
    db: SessionDep,
    student: Student,
    *,
    email: str | None,
    full_name: str,
    create_user: bool,
    password: str | None,
) -> tuple[User | None, str | None]:
    normalized_email = email.strip().lower() if isinstance(email, str) and email.strip() else None
    warning: str | None = None
    existing_user = user_crud.get_user_by_student_id(db, student.id)

    if existing_user:
        student.user_id = existing_user.id
        if normalized_email and existing_user.email != normalized_email:
            conflict_owner = user_crud.get_user_by_email(db, normalized_email)
            if conflict_owner and conflict_owner.id != existing_user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu email allaqachon boshqa foydalanuvchiga ulangan.")
            existing_user.email = normalized_email
            db.add(existing_user)
        return existing_user, warning

    if not create_user:
        return None, warning

    if not normalized_email:
        warning = "Email yo'q. Student login account yaratilmadi."
        return None, warning

    email_owner = user_crud.get_user_by_email(db, normalized_email)
    if email_owner:
        linked_student = db.scalar(select(Student).where(Student.user_id == email_owner.id))
        if linked_student and linked_student.id == student.id:
            student.user_id = email_owner.id
            return email_owner, warning
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu email allaqachon boshqa foydalanuvchiga ulangan.")

    user = User(
        email=normalized_email,
        full_name=full_name,
        password_hash=hash_password(password or DEFAULT_STUDENT_PASSWORD),
        role="student",
        is_active=True,
    )
    db.add(user)
    db.flush()
    student.user_id = user.id
    student.email = normalized_email
    return user, warning


def _approve_student_application(student_id: int, payload: StudentApproveRequest, db: SessionDep) -> StudentApproveResponse:
    student = db.scalar(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.teacher), selectinload(Student.group).selectinload(Group.students))
        .where(Student.id == student_id)
    )
    if not student:
        raise not_found("Student")

    existing_code = _active_parent_code(db, student.id)
    if student.trial_lesson_status == "approved":
        return _build_approve_response(db, student, parent_code=existing_code)

    group: Group | None = None
    if payload.group_id is not None:
        group = db.scalar(
            select(Group)
            .options(selectinload(Group.teacher), selectinload(Group.students))
            .where(Group.id == payload.group_id)
        )
        if not group:
            raise not_found("Group")
        if not group.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu guruh nofaol. Avval guruhni faollashtiring.")

    email = payload.email or student.email
    create_user = payload.create_student_user or bool(email)
    user, account_warning = _ensure_student_user(
        db,
        student,
        email=email,
        full_name=f"{student.firstname} {student.lastname}".strip(),
        create_user=create_user,
        password=payload.password or DEFAULT_STUDENT_PASSWORD,
    )

    if group is not None:
        student.group_id = group.id
        student.teacher_id = group.teacher_id
    student.is_active = True
    student.trial_lesson_status = "approved"
    db.add(student)
    db.flush()

    parent_code = existing_code
    if payload.generate_parent_code and parent_code is None:
        parent_code = create_parent_connection_code(
            db,
            student,
            relation_type=payload.relation_type,
            commit=False,
        )

    try:
        db.commit()
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)

    db.refresh(student)
    if parent_code is not None:
        db.refresh(parent_code)
    if user is not None:
        db.refresh(user)
    if group is not None:
        db.refresh(group)
    return _build_approve_response(db, student, group=group, parent_code=parent_code, user=user, account_warning=account_warning)


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: SessionDep, _admin: AdminUser) -> StudentRead:
    try:
        student = student_crud.create_student(db, payload)
        user, _warning = _ensure_student_user(
            db,
            student,
            email=payload.email,
            full_name=f"{student.firstname} {student.lastname}".strip(),
            create_user=True,
            password=payload.password or DEFAULT_STUDENT_PASSWORD,
        )
        if user is not None or student.user_id:
            if not student.trial_lesson_status or student.trial_lesson_status == "new":
                student.trial_lesson_status = "joined"
        db.add(student)
        db.commit()
        db.refresh(student)
        return student
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.post("/register", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentCreate, db: SessionDep) -> StudentRead:
    try:
        return student_crud.create_student(db, payload)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[StudentListItem])
def list_students(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    group_id: int | None = None,
    is_active: bool | None = None,
    q: str | None = None,
) -> list[StudentListItem]:
    return student_crud.list_students(db, skip=skip, limit=limit, group_id=group_id, is_active=is_active, q=q)


@router.get("/summary", response_model=StudentSummary)
def get_student_summary(db: SessionDep, _admin: AdminUser) -> StudentSummary:
    total_students = db.scalar(select(func.count(Student.id))) or 0
    assigned_students = db.scalar(select(func.count(Student.id)).where(Student.group_id.is_not(None))) or 0
    return StudentSummary(
        total_students=total_students,
        assigned_students=assigned_students,
        unassigned_students=max(total_students - assigned_students, 0),
    )


@router.post("/applications/{application_id}/approve", response_model=StudentApproveResponse)
def approve_application(application_id: int, payload: StudentApproveRequest, db: SessionDep, _admin: AdminUser) -> StudentApproveResponse:
    return _approve_student_application(application_id, payload, db)


@router.post("/applications/{application_id}/reject", response_model=StudentRead)
def reject_application(application_id: int, payload: StudentRejectRequest, db: SessionDep, _admin: AdminUser) -> StudentRead:
    student = student_crud.get_student(db, application_id)
    if not student:
        raise not_found("Student")
    student.trial_lesson_status = "rejected"
    if payload.reason:
        current_comment = (student.comment or "").strip()
        reason = f"Rad etish sababi: {payload.reason.strip()}"
        student.comment = f"{current_comment}\n\n{reason}".strip() if current_comment else reason
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentRead)
def get_student(student_id: int, db: SessionDep, _admin: AdminUser) -> StudentRead:
    student = student_crud.get_student(db, student_id)
    if not student:
        raise not_found("Student")
    return student


@router.put("/{student_id}", response_model=StudentRead)
def update_student(student_id: int, payload: StudentUpdate, db: SessionDep, _admin: AdminUser) -> StudentRead:
    student = student_crud.get_student(db, student_id)
    if not student:
        raise not_found("Student")
    try:
        return student_crud.update_student(db, student, payload)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.post("/{student_id}/approve", response_model=StudentApproveResponse, status_code=status.HTTP_201_CREATED)
def approve_student(student_id: int, payload: StudentApproveRequest, db: SessionDep, _admin: AdminUser) -> StudentApproveResponse:
    return _approve_student_application(student_id, payload, db)


@router.post("/{student_id}/generate-parent-code", response_model=ParentConnectionCodeRead)
def generate_parent_code(student_id: int, db: SessionDep, _admin: AdminUser) -> ParentConnectionCodeRead:
    student = student_crud.get_student(db, student_id)
    if not student:
        raise not_found("Student")
    return create_parent_connection_code(db, student)


@router.get("/{student_id}/parent-link-status", response_model=ParentLinkStatusRead)
def get_parent_link_status(student_id: int, db: SessionDep, _admin: AdminUser) -> ParentLinkStatusRead:
    if not student_crud.get_student(db, student_id):
        raise not_found("Student")
    links = _student_parent_links(db, student_id)
    return ParentLinkStatusRead(
        student_id=student_id,
        parent_connected=any(bool(link.parent and link.parent.is_connected) for link in links),
        parent_links=links,
        active_code=_active_parent_code(db, student_id),
    )


@router.post("/{student_id}/link-parent", response_model=ParentStudentLinkRead)
def link_parent(student_id: int, payload: ParentStudentLinkCreate, db: SessionDep, _admin: AdminUser) -> ParentStudentLinkRead:
    student = student_crud.get_student(db, student_id)
    parent = db.get(Parent, payload.parent_id)
    if not student:
        raise not_found("Student")
    if not parent:
        raise not_found("Parent")
    return link_parent_to_student(
        db,
        parent=parent,
        student=student,
        relation_type=payload.relation_type,
        is_primary=payload.is_primary,
    )


@router.get("/{student_id}/parents", response_model=list[ParentStudentLinkRead])
def list_student_parents(student_id: int, db: SessionDep, _admin: AdminUser) -> list[ParentStudentLinkRead]:
    if not student_crud.get_student(db, student_id):
        raise not_found("Student")
    return list(
        db.scalars(
            select(ParentStudentLink)
            .options(selectinload(ParentStudentLink.parent))
            .where(ParentStudentLink.student_id == student_id)
        )
    )


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: SessionDep, _admin: AdminUser) -> Response:
    student = student_crud.get_student(db, student_id)
    if not student:
        raise not_found("Student")
    student_crud.delete_student(db, student)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{student_id}/payments", response_model=list[PaymentRead])
def get_student_payments(student_id: int, db: SessionDep, _admin: AdminUser) -> list[PaymentRead]:
    if not student_crud.get_student(db, student_id):
        raise not_found("Student")
    return payment_crud.list_payments(db, student_id=student_id)


@router.get("/{student_id}/attendance", response_model=list[AttendanceRead])
def get_student_attendance(student_id: int, db: SessionDep, _admin: AdminUser) -> list[AttendanceRead]:
    if not student_crud.get_student(db, student_id):
        raise not_found("Student")
    return [
        item
        for item in db.query(AttendanceTable)
        .filter(AttendanceTable.student_id == student_id)
        .order_by(AttendanceTable.created_at.desc())
        .all()
    ]
