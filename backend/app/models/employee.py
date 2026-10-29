from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.update_request import UpdateRequest

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    position: Mapped[str] = mapped_column(String(150), nullable=False)
    hire_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    verification_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="employee")
    update_requests: Mapped[list["UpdateRequest"]] = relationship(back_populates="employee", cascade="all, delete-orphan")

    aadhaar_document_path: Mapped[str] = mapped_column(String(255), nullable=True)
    pan_document_path: Mapped[str] = mapped_column(String(255), nullable=True)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True
    )