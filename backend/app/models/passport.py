from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.student import Student


class Passport(Base):
    __tablename__ = "passports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    firstname: Mapped[str] = mapped_column(String(100))
    lastname: Mapped[str] = mapped_column(String(100))
    seria: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    jshir: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    passport_number: Mapped[str | None] = mapped_column(String(30), nullable=True, unique=True)
    issued_by: Mapped[str | None] = mapped_column(String(180), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), unique=True)

    student: Mapped["Student"] = relationship(back_populates="passport")
