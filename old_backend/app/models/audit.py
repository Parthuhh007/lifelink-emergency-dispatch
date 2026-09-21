from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base, utc_now


class AuditLog(Base):
    """Immutable audit trail of all agent actions and decisions."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"AUD-{uuid.uuid4().hex[:8].upper()}")
    emergency_id: Mapped[str] = mapped_column(String(50), nullable=True, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    tool_used: Mapped[str] = mapped_column(String(100), default="InternalReasoning", nullable=False)

    input_payload: Mapped[str] = mapped_column(Text, nullable=False)
    output_payload: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    human_approval_status: Mapped[str] = mapped_column(
        String(50),
        default="NOT_REQUIRED",
        nullable=False
    )
    # NOT_REQUIRED, WAITING_FOR_CONFIRMATION, APPROVED, REJECTED, OVERRIDDEN

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )
