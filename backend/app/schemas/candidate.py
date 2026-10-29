from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from app.schemas.user import UserRead


class CandidateBase(BaseModel):
    phone: str
    location: str
    experience_summary: Optional[str] = None
    status: str = "new"


class CandidateCreate(CandidateBase):
    user_id: int | None = None


class CandidateRead(CandidateBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True

