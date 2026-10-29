from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ApplicationBase(BaseModel):
    cover_letter: Optional[str] = None
    status: str = "submitted"


class ApplicationCreate(ApplicationBase):
    candidate_id: Optional[int] = None
    open_position_id: int


class ApplicationRead(ApplicationBase):
    id: int
    candidate_id: int
    open_position_id: int
    open_position_title: Optional[str] = None
    candidate_name: Optional[str] = None
    applied_at: datetime

    class Config:
        from_attributes = True
