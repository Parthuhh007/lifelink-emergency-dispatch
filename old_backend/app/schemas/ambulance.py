from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AmbulanceBase(BaseModel):
    callsign: str
    capability: str
    status: str
    current_lat: float
    current_lng: float
    heading: float = 0.0
    speed_kmh: float = 0.0


class AmbulanceUpdateTelemetry(BaseModel):
    status: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    heading: Optional[float] = None
    speed_kmh: Optional[float] = None
    assigned_emergency_id: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    eta_minutes: Optional[float] = None


class AmbulanceResponse(AmbulanceBase):
    id: str
    assigned_emergency_id: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    eta_minutes: Optional[float] = None
    last_telemetry_update: Optional[datetime] = None
    staleness_seconds: Optional[int] = 0
    is_available: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
