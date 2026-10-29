from datetime import datetime
from pydantic import BaseModel


class UpdateRequestItemRead(BaseModel):
    id: int
    update_request_id: int
    field_name: str
    old_value: str | None = None
    new_value: str | None = None
    status: str = "pending"
    rejection_reason: str | None = None

    class Config:
        from_attributes = True


class UpdateRequestRead(BaseModel):
    id: int
    request_id: str
    employee_id: int
    source: str
    request_type: str
    field_name: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[UpdateRequestItemRead] = []

    class Config:
        from_attributes = True


class ActionResponse(BaseModel):
    detail: str
