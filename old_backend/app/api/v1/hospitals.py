from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ...core.database import get_db
from ...adapters.hospital_adapter import get_hospital_adapter
from ...schemas.hospital import HospitalResponse, HospitalUpdateCapacity
from .ws import ws_manager

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


@router.get("", response_model=List[HospitalResponse])
async def list_hospitals():
    """Retrieve current digital twin status for all registered hospitals."""
    adapter = get_hospital_adapter()
    hospitals = await adapter.get_all_hospitals()
    return hospitals


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(hospital_id: str):
    """Retrieve details for a specific hospital."""
    adapter = get_hospital_adapter()
    hospital = await adapter.get_hospital_by_id(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.patch("/{hospital_id}/capacity", response_model=HospitalResponse)
async def update_capacity(hospital_id: str, payload: HospitalUpdateCapacity):
    """Update bed capacity or diversion status."""
    adapter = get_hospital_adapter()
    updated = await adapter.update_hospital_capacity(
        hospital_id=hospital_id,
        status=payload.status,
        icu_available=payload.icu_available,
        ed_beds_available=payload.ed_beds_available
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Broadcast capacity change
    await ws_manager.broadcast("hospital_update", updated)
    return updated
