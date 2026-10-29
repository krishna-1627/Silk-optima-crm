from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "candidate"
    updated_at: Optional[datetime] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    skills: Optional[str] = None
    about: Optional[str] = None
    application_draft: Optional[str] = None
    application_step: Optional[int] = None
    application_submitted: Optional[bool] = None
    application_submitted_at: Optional[datetime] = None
    application_id: Optional[str] = None
    verification_status: Optional[str] = "Pending"
    verification_rejection_reason: Optional[str] = None
    account_status: Optional[str] = "Active"
    # Additional profile fields
    profile_photo: Optional[str] = None
    resume_url: Optional[str] = None
    resume_filename: Optional[str] = None
    degree_certificate_url: Optional[str] = None
    degree_certificate_filename: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    emergency_contact: Optional[str] = None
    # Education
    college: Optional[str] = None
    university: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[str] = None
    cgpa: Optional[str] = None
    tenth_percentage: Optional[str] = None
    twelfth_percentage: Optional[str] = None
    # Experience
    is_fresher: Optional[bool] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    experience_description: Optional[str] = None
    projects: Optional[str] = None
    achievements: Optional[str] = None
    certifications: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    skills: Optional[str] = None
    about: Optional[str] = None
    application_draft: Optional[dict[str, Any]] = None
    application_step: Optional[int] = None
    application_submitted: Optional[bool] = None
    application_submitted_at: Optional[datetime] = None
    application_id: Optional[str] = None
    profile_photo: Optional[str] = None
    resume_url: Optional[str] = None
    resume_filename: Optional[str] = None
    degree_certificate_url: Optional[str] = None
    degree_certificate_filename: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    emergency_contact: Optional[str] = None
    # Education
    college: Optional[str] = None
    university: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[str] = None
    cgpa: Optional[str] = None
    tenth_percentage: Optional[str] = None
    twelfth_percentage: Optional[str] = None
    # Experience
    is_fresher: Optional[bool] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    experience_description: Optional[str] = None
    projects: Optional[str] = None
    achievements: Optional[str] = None
    certifications: Optional[str] = None


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
