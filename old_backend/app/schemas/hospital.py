from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class HospitalBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    trauma_level: str
    has_cath_lab: bool
    has_stroke_center: bool
    has_burn_unit: bool
    has_pediatric_icu: bool
    has_ct_scan: bool = True
    has_mri: bool = True


class HospitalUpdateCapacity(BaseModel):
    status: Optional[str] = None
    icu_available: Optional[int] = None
    icu_total: Optional[int] = None
    ed_beds_available: Optional[int] = None
    ed_beds_total: Optional[int] = None


class HospitalResponse(HospitalBase):
    id: str
    status: str
    icu_total: int
    icu_available: int
    ed_beds_total: int
    ed_beds_available: int
    last_telemetry_update: Optional[datetime] = None
    staleness_seconds: Optional[int] = 0
    is_stale: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
