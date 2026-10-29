from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.candidate import Candidate
    from app.models.open_position import OpenPosition


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False)
    open_position_id: Mapped[int] = mapped_column(ForeignKey("open_positions.id"), nullable=False)
    cover_letter: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="submitted", nullable=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    candidate: Mapped["Candidate"] = relationship(back_populates="applications")
    open_position: Mapped["OpenPosition"] = relationship(back_populates="applications")

    @property
    def open_position_title(self) -> str | None:
        return self.open_position.title if self.open_position else None

    @property
    def candidate_name(self) -> str | None:
        return self.candidate.user.full_name if self.candidate and self.candidate.user else None
