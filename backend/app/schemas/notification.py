from datetime import datetime
from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: str
    title: str
    employee_id: int
    employee_name: str
    employee_email: str
    event_type: str
    created_at: datetime
    is_read: bool = False
    action_url: str
    description: str
    reason: str | None = None

    class Config:
        from_attributes = True
