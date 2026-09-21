from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from ..core.database import async_session_factory, utc_now
from ..models.hospital import Hospital
from .base import HospitalAdapter


def hospital_to_dict(hospital: Hospital) -> Dict[str, Any]:
    """Format Hospital model into structured dictionary with staleness metrics."""
    now = datetime.now(timezone.utc)
    updated = hospital.last_telemetry_update
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    seconds_since_update = round((now - updated).total_seconds())

    return {
        "id": hospital.id,
        "name": hospital.name,
        "address": hospital.address,
        "latitude": hospital.latitude,
        "longitude": hospital.longitude,
        "trauma_level": hospital.trauma_level,
        "has_cath_lab": hospital.has_cath_lab,
        "has_stroke_center": hospital.has_stroke_center,
        "has_burn_unit": hospital.has_burn_unit,
        "has_pediatric_icu": hospital.has_pediatric_icu,
        "has_ct_scan": hospital.has_ct_scan,
        "has_mri": hospital.has_mri,
        "status": hospital.status,
        "icu_total": hospital.icu_total,
        "icu_available": hospital.icu_available,
        "ed_beds_total": hospital.ed_beds_total,
        "ed_beds_available": hospital.ed_beds_available,
        "last_telemetry_update": updated,
        "staleness_seconds": seconds_since_update,
        "is_stale": seconds_since_update > 300,
        "created_at": hospital.created_at,
        "updated_at": hospital.updated_at
    }


class DatabaseSimulatedHospitalAdapter(HospitalAdapter):
    """
    Standard Hospital Integration Adapter.
    Exposes hospital capabilities, real-time bed capacity, and diversion status.
    Can be seamlessly swapped with a live HL7 FHIR adapter in production.
    """

    async def get_all_hospitals(self) -> List[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Hospital))
            hospitals = result.scalars().all()
            return [hospital_to_dict(h) for h in hospitals]

    async def get_hospital_by_id(self, hospital_id: str) -> Optional[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Hospital).where(Hospital.id == hospital_id))
            hospital = result.scalar_one_or_none()
            if hospital:
                return hospital_to_dict(hospital)
            return None

    async def update_hospital_capacity(
        self,
        hospital_id: str,
        status: Optional[str] = None,
        icu_available: Optional[int] = None,
        ed_beds_available: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Hospital).where(Hospital.id == hospital_id))
            hospital = result.scalar_one_or_none()
            if not hospital:
                return None

            if status is not None:
                hospital.status = status
            if icu_available is not None:
                hospital.icu_available = max(0, min(hospital.icu_total, icu_available))
            if ed_beds_available is not None:
                hospital.ed_beds_available = max(0, min(hospital.ed_beds_total, ed_beds_available))

            hospital.last_telemetry_update = utc_now()
            await session.commit()
            await session.refresh(hospital)
            return hospital_to_dict(hospital)


_hospital_adapter_instance = DatabaseSimulatedHospitalAdapter()


def get_hospital_adapter() -> HospitalAdapter:
    """Return the active HospitalAdapter instance."""
    return _hospital_adapter_instance
