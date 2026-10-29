from datetime import datetime
import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


class UpdateRequest(Base):
    __tablename__ = "update_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False, default=lambda: str(uuid.uuid4()))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="employee")
    request_type: Mapped[str] = mapped_column(String(50), nullable=False, default="profile_update")
    field_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="update_requests")
    items: Mapped[List["UpdateRequestItem"]] = relationship(
        "UpdateRequestItem", back_populates="update_request", cascade="all, delete-orphan"
    )


class UpdateRequestItem(Base):
    __tablename__ = "update_request_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    update_request_id: Mapped[int] = mapped_column(ForeignKey("update_requests.id"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(128), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    update_request: Mapped["UpdateRequest"] = relationship("UpdateRequest", back_populates="items")
