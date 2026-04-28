from fastapi import APIRouter, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, SessionDep
from app.models.parent import Parent
from app.schemas.parent import ParentCreate, ParentRead
from app.utils.helpers import conflict_from_integrity_error, not_found

router = APIRouter()


@router.post("", response_model=ParentRead, status_code=status.HTTP_201_CREATED)
def create_parent(payload: ParentCreate, db: SessionDep, _admin: AdminUser) -> ParentRead:
    parent = Parent(**payload.model_dump(exclude_none=True))
    try:
        db.add(parent)
        db.commit()
        db.refresh(parent)
        return parent
    except IntegrityError as exc:
        conflict_from_integrity_error(db, exc)


@router.get("", response_model=list[ParentRead])
def list_parents(
    db: SessionDep,
    _admin: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    is_connected: bool | None = None,
) -> list[ParentRead]:
    query = select(Parent)
    if is_connected is not None:
        query = query.where(Parent.is_connected.is_(is_connected))
    query = query.order_by(Parent.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


@router.get("/{parent_id}", response_model=ParentRead)
def get_parent(parent_id: int, db: SessionDep, _admin: AdminUser) -> ParentRead:
    parent = db.scalar(select(Parent).options(selectinload(Parent.student_links)).where(Parent.id == parent_id))
    if not parent:
        raise not_found("Parent")
    return parent
