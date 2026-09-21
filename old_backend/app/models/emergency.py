from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base, utc_now


class Emergency(Base):
    """Primary emergency case record."""
    __tablename__ = "emergencies"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"EMG-{uuid.uuid4().hex[:8].upper()}")
    tracking_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, default=lambda: f"LL-{uuid.uuid4().hex[:6].upper()}")

    # Workflow Status & State Machine
    status: Mapped[str] = mapped_column(String(50), default="REPORTED", nullable=False, index=True)
    # REPORTED, TRIAGED, DISPATCHING, DISPATCHED, EN_ROUTE_SCENE, ON_SCENE, TRANSPORTING, REROUTING, HANDOFF_PENDING, RESOLVED, CANCELLED

    human_confirmation_status: Mapped[str] = mapped_column(
        String(50),
        default="SYSTEM_GENERATED",
        nullable=False,
        index=True
    )
    # SYSTEM_GENERATED, WAITING_FOR_CONFIRMATION, APPROVED, REJECTED, OVERRIDDEN

    # Caller & Incident Information (Synthetic / De-identified)
    caller_name: Mapped[str] = mapped_column(String(255), default="Anonymous Bystander", nullable=False)
    caller_phone: Mapped[str] = mapped_column(String(50), default="555-0100", nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Clinical Intake & Urgency
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    reported_symptoms_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    preliminary_urgency: Mapped[str] = mapped_column(String(50), default="LEVEL_3_URGENT", nullable=False)
    # LEVEL_1_RESUSCITATION, LEVEL_2_EMERGENT, LEVEL_3_URGENT, LEVEL_4_SEMI_URGENT, LEVEL_5_NON_URGENT

    # Resource Assignments
    assigned_ambulance_id: Mapped[str] = mapped_column(String(50), nullable=True)
    assigned_hospital_id: Mapped[str] = mapped_column(String(50), nullable=True)
    backup_hospital_id: Mapped[str] = mapped_column(String(50), nullable=True)
    route_eta_minutes: Mapped[float] = mapped_column(Float, nullable=True)

    # Explainability & Trust
    recommended_reasoning: Mapped[str] = mapped_column(Text, nullable=True)
    clinician_confirmed_notes: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    timeline_events: Mapped[list["TimelineEvent"]] = relationship(
        "TimelineEvent",
        back_populates="emergency",
        cascade="all, delete-orphan",
        order_by="TimelineEvent.created_at"
    )


class TimelineEvent(Base):
    """Chronological event log for an emergency."""
    __tablename__ = "timeline_events"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    emergency_id: Mapped[str] = mapped_column(String(50), ForeignKey("emergencies.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), default="System", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    emergency: Mapped["Emergency"] = relationship("Emergency", back_populates="timeline_events")
