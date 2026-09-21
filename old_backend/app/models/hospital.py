from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base, utc_now


class Hospital(Base):
    """Hospital facility digital twin record."""
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"HOSP-{uuid.uuid4().hex[:8].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Clinical Capabilities
    trauma_level: Mapped[str] = mapped_column(String(50), default="None", nullable=False)
    has_cath_lab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_stroke_center: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_burn_unit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_pediatric_icu: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_ct_scan: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_mri: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Dynamic Digital Twin Capacity
    status: Mapped[str] = mapped_column(String(50), default="NORMAL", nullable=False)  # NORMAL, SURGE, DIVERSION, CLOSED
    icu_total: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    icu_available: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    ed_beds_total: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    ed_beds_available: Mapped[int] = mapped_column(Integer, default=12, nullable=False)

    # Telemetry Timestamp for Staleness Detection
    last_telemetry_update: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )
