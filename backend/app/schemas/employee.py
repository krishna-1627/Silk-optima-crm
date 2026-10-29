from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserRead


class EmployeeCreate(BaseModel):
    department: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = "active"
    user_id: Optional[int] = None
    employeeId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    joiningDate: Optional[str] = None
    lastWorkingDay: Optional[str] = None
    employmentStatus: Optional[str] = None
    experience: Optional[str] = None
    location: Optional[str] = None


class EmployeeUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")

    full_name: Optional[str] = None
    phone: Optional[str] = None 
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    degree: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[str] = None
    cgpa: Optional[str] = None
    skills: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None


class EmployeeRead(BaseModel):
    id: int
    user_id: int
    department: str
    position: str
    hire_date: datetime
    status: str
    verification_status: str
    verification_rejection_reason: Optional[str] = None
    aadhaar_document_path: Optional[str] = None
    pan_document_path: Optional[str] = None
    last_updated: Optional[datetime] = None
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True