from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.candidate import Candidate


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="candidate", nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
    location: Mapped[str] = mapped_column(String(150), nullable=True)
    linkedin: Mapped[str] = mapped_column(String(255), nullable=True)
    github: Mapped[str] = mapped_column(String(255), nullable=True)
    skills: Mapped[str] = mapped_column(String(255), nullable=True)
    about: Mapped[str] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    verification_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    application_draft: Mapped[str] = mapped_column(Text, nullable=True)
    application_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    application_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    application_submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    application_id: Mapped[str] = mapped_column(String(64), nullable=True)
    # Additional profile, education, experience, and government fields
    profile_photo: Mapped[str] = mapped_column(String(1024), nullable=True)
    resume_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    resume_filename: Mapped[str] = mapped_column(String(255), nullable=True)
    degree_certificate_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    degree_certificate_filename: Mapped[str] = mapped_column(String(255), nullable=True)
    aadhaar_number: Mapped[str] = mapped_column(String(32), nullable=True)
    pan_number: Mapped[str] = mapped_column(String(16), nullable=True)
    date_of_birth: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    gender: Mapped[str] = mapped_column(String(24), nullable=True)
    current_address: Mapped[str] = mapped_column(Text, nullable=True)
    permanent_address: Mapped[str] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[str] = mapped_column(String(30), nullable=True)
    # Education
    college: Mapped[str] = mapped_column(String(255), nullable=True)
    university: Mapped[str] = mapped_column(String(255), nullable=True)
    degree: Mapped[str] = mapped_column(String(255), nullable=True)
    branch: Mapped[str] = mapped_column(String(255), nullable=True)
    graduation_year: Mapped[str] = mapped_column(String(50), nullable=True)
    cgpa: Mapped[str] = mapped_column(String(50), nullable=True)
    tenth_percentage: Mapped[str] = mapped_column(String(50), nullable=True)
    twelfth_percentage: Mapped[str] = mapped_column(String(50), nullable=True)
    # Bank and government
    account_holder_name: Mapped[str] = mapped_column(String(255), nullable=True)
    bank_name: Mapped[str] = mapped_column(String(255), nullable=True)
    account_number: Mapped[str] = mapped_column(String(50), nullable=True)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=True)
    bank_branch: Mapped[str] = mapped_column(String(100), nullable=True)
    upi_id: Mapped[str] = mapped_column(String(100), nullable=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=True)
    nationality: Mapped[str] = mapped_column(String(100), nullable=True)
    languages_known: Mapped[str] = mapped_column(String(255), nullable=True)
    marital_status: Mapped[str] = mapped_column(String(50), nullable=True)
    passport_number: Mapped[str] = mapped_column(String(50), nullable=True)
    pin_code: Mapped[str] = mapped_column(String(20), nullable=True)
    # Experience
    is_fresher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    designation: Mapped[str] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(100), nullable=True)
    start_date: Mapped[str] = mapped_column(String(50), nullable=True)
    end_date: Mapped[str] = mapped_column(String(50), nullable=True)
    experience_description: Mapped[str] = mapped_column(Text, nullable=True)
    projects: Mapped[str] = mapped_column(Text, nullable=True)
    achievements: Mapped[str] = mapped_column(Text, nullable=True)
    certifications: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_failed_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    account_locked_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    password_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    remember_token: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    candidate: Mapped["Candidate"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
