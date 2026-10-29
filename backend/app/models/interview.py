from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AIInterview(Base):
    __tablename__ = "ai_interviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scheduled_date: Mapped[str] = mapped_column(String(50), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(100), nullable=False)
    turns_limit: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    interview_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="SCHEDULED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Simplified Interview Output
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    candidate: Mapped["User"] = relationship("User", foreign_keys=[candidate_id])


