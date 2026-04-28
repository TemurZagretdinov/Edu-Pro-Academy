from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def not_found(resource: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found")


def conflict_from_integrity_error(db: Session, exc: IntegrityError) -> None:
    db.rollback()
    message = str(exc.orig) if getattr(exc, "orig", None) else "Unique or foreign key constraint failed"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message[:300]) from exc
