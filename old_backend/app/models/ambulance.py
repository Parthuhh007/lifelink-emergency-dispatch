from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base, utc_now


class Ambulance(Base):
    """Ambulance emergency vehicle telematics record."""
    __tablename__ = "ambulances"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"AMB-{uuid.uuid4().hex[:6].upper()}")
    callsign: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    capability: Mapped[str] = mapped_column(String(50), default="ALS", nullable=False)  # ALS, BLS, MICU, PICU
    status: Mapped[str] = mapped_column(String(50), default="AVAILABLE", nullable=False)
    # AVAILABLE, DISPATCHED, EN_ROUTE_PATIENT, ON_SCENE, TRANSPORTING, OUT_OF_SERVICE

    # Real Coordinates Telemetry
    current_lat: Mapped[float] = mapped_column(Float, nullable=False)
    current_lng: Mapped[float] = mapped_column(Float, nullable=False)
    heading: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Active Assignment Telemetry
    assigned_emergency_id: Mapped[str] = mapped_column(String(50), nullable=True, index=True)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[float] = mapped_column(Float, nullable=True)
    eta_minutes: Mapped[float] = mapped_column(Float, nullable=True)

    last_telemetry_update: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )
