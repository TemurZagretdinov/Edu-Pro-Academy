from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.schemas.payment import PaymentCreate


def get_payment(db: Session, payment_id: int) -> Payment | None:
    return db.get(Payment, payment_id)


def create_payment(db: Session, payload: PaymentCreate) -> Payment:
    payment = Payment(**payload.model_dump(exclude_none=True))
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def list_payments(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    student_id: int | None = None,
    is_cash: bool | None = None,
    status: str | None = None,
) -> list[Payment]:
    query = select(Payment).offset(skip).limit(limit).order_by(Payment.created_at.desc())
    if student_id is not None:
        query = query.where(Payment.student_id == student_id)
    if is_cash is not None:
        query = query.where(Payment.is_cash == is_cash)
    if status is not None:
        query = query.where(Payment.status == status)
    return list(db.scalars(query))
