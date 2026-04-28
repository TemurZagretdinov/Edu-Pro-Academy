from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeacherBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    phone_number: str = Field(min_length=5, max_length=50)
    direction: str | None = Field(default=None, max_length=150)
    hire_date: date | None = None
    bio: str | None = None


class TeacherCreate(TeacherBase):
    password: str | None = Field(default=None, min_length=6)


class TeacherUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, min_length=5, max_length=50)
    direction: str | None = Field(default=None, max_length=150)
    hire_date: date | None = None
    bio: str | None = None


class TeacherRead(TeacherBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
