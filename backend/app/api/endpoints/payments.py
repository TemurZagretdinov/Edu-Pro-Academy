from datetime import datetime, timezone

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, SessionDep
from app.crud import payment as payment_crud
from app.models.payment import Payment
from app.schemas.payment import MonthlyPaymentSummary, PaymentCreate, PaymentRead
from app.utils.helpers import conflict_from_integrity_error

router = APIRouter()


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: SessionDep, _admin: AdminUser) -> PaymentRead:
    try:
        return payment_crud.create_payment(db, payload)
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[PaymentRead])
def list_payments(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    student_id: int | None = None,
    is_cash: bool | None = None,
    status: str | None = None,
) -> list[PaymentRead]:
    return payment_crud.list_payments(db, skip=skip, limit=limit, student_id=student_id, is_cash=is_cash, status=status)


@router.get("/students/{student_id}", response_model=list[PaymentRead])
def get_student_payment_history(student_id: int, db: SessionDep, _admin: AdminUser) -> list[PaymentRead]:
    return payment_crud.list_payments(db, student_id=student_id)


@router.get("/summary/monthly", response_model=list[MonthlyPaymentSummary])
def monthly_payment_summary(
    db: SessionDep,
    _admin: AdminUser,
    year: int | None = Query(default=None, ge=2000, le=2100),
) -> list[MonthlyPaymentSummary]:
    month_expr = func.date_trunc("month", Payment.created_at).label("month")
    query = (
        select(month_expr, func.coalesce(func.sum(Payment.amount), 0), func.count(Payment.id))
        .group_by(month_expr)
        .order_by(month_expr.desc())
    )
    if year is not None:
        start = datetime(year, 1, 1, tzinfo=timezone.utc)
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        query = query.where(Payment.created_at >= start, Payment.created_at < end)
    return [
        MonthlyPaymentSummary(month=row[0], total_amount=row[1], payment_count=row[2])
        for row in db.execute(query).all()
    ]
