from pydantic import BaseModel, ConfigDict, Field


class PassportBase(BaseModel):
    firstname: str = Field(min_length=1, max_length=100)
    lastname: str = Field(min_length=1, max_length=100)
    seria: str = Field(min_length=2, max_length=20)
    jshir: str = Field(min_length=6, max_length=20)
    passport_number: str | None = Field(default=None, max_length=30)
    issued_by: str | None = Field(default=None, max_length=180)
    notes: str | None = None


class PassportCreate(PassportBase):
    pass


class PassportUpdate(BaseModel):
    firstname: str | None = Field(default=None, min_length=1, max_length=100)
    lastname: str | None = Field(default=None, min_length=1, max_length=100)
    seria: str | None = Field(default=None, min_length=2, max_length=20)
    jshir: str | None = Field(default=None, min_length=6, max_length=20)
    passport_number: str | None = Field(default=None, max_length=30)
    issued_by: str | None = Field(default=None, max_length=180)
    notes: str | None = None


class PassportRead(PassportBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
