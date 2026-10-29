from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OpenPositionBase(BaseModel):
    title: str
    department: str
    location: str
    job_type: str
    description: str
    is_active: bool = True


class OpenPositionCreate(OpenPositionBase):
    pass


class OpenPositionRead(OpenPositionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
