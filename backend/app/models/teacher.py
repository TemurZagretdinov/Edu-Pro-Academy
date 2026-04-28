from typing import TYPE_CHECKING

from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.group import Group
    from app.models.group import GroupTeacher
    from app.models.homework import Homework
    from app.models.user import User


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    direction: Mapped[str | None] = mapped_column(String(150), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    groups: Mapped[list["Group"]] = relationship(back_populates="teacher")
    group_links: Mapped[list["GroupTeacher"]] = relationship(
        back_populates="teacher",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    user: Mapped["User | None"] = relationship(back_populates="teacher", uselist=False)
    homework_items: Mapped[list["Homework"]] = relationship(
        back_populates="teacher",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
