from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    teacher_id: int | None = None
    student_id: int | None = None
    full_name: str
    user: UserRead


class CreateTeacherUserRequest(BaseModel):
    teacher_id: int
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    password: str = Field(min_length=6)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if isinstance(value, str) else value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
