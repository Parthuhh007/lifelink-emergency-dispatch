from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from ..core.database import async_session_factory, utc_now
from ..models.ambulance import Ambulance
from .base import FleetAdapter


def ambulance_to_dict(amb: Ambulance) -> Dict[str, Any]:
    """Format Ambulance model into structured dictionary."""
    now = datetime.now(timezone.utc)
    updated = amb.last_telemetry_update
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    seconds_since_update = round((now - updated).total_seconds())

    return {
        "id": amb.id,
        "callsign": amb.callsign,
        "capability": amb.capability,
        "status": amb.status,
        "current_lat": amb.current_lat,
        "current_lng": amb.current_lng,
        "heading": amb.heading,
        "speed_kmh": amb.speed_kmh,
        "assigned_emergency_id": amb.assigned_emergency_id,
        "destination_lat": amb.destination_lat,
        "destination_lng": amb.destination_lng,
        "eta_minutes": amb.eta_minutes,
        "last_telemetry_update": updated,
        "staleness_seconds": seconds_since_update,
        "is_available": amb.status == "AVAILABLE",
        "created_at": amb.created_at,
        "updated_at": amb.updated_at
    }


class DatabaseSimulatedFleetAdapter(FleetAdapter):
    """
    Standard Ambulance Fleet / AVL / CAD Integration Adapter.
    Exposes vehicle positions, operational availability, capabilities (ALS/BLS/MICU), and telemetry.
    Can be swapped with a live CAD (Computer-Aided Dispatch) adapter in production.
    """

    async def get_all_ambulances(self) -> List[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Ambulance))
            ambulances = result.scalars().all()
            return [ambulance_to_dict(a) for a in ambulances]

    async def get_ambulance_by_id(self, ambulance_id: str) -> Optional[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Ambulance).where(Ambulance.id == ambulance_id))
            amb = result.scalar_one_or_none()
            if amb:
                return ambulance_to_dict(amb)
            return None

    async def update_ambulance_telemetry(
        self,
        ambulance_id: str,
        status: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        eta_minutes: Optional[float] = None,
        assigned_emergency_id: Optional[str] = None,
        heading: Optional[float] = None,
        speed_kmh: Optional[float] = None,
        destination_lat: Optional[float] = None,
        destination_lng: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(select(Ambulance).where(Ambulance.id == ambulance_id))
            amb = result.scalar_one_or_none()
            if not amb:
                return None

            if status is not None:
                amb.status = status
            if lat is not None:
                amb.current_lat = lat
            if lng is not None:
                amb.current_lng = lng
            if eta_minutes is not None:
                amb.eta_minutes = eta_minutes
            if assigned_emergency_id is not None:
                amb.assigned_emergency_id = assigned_emergency_id
            if heading is not None:
                amb.heading = heading
            if speed_kmh is not None:
                amb.speed_kmh = speed_kmh
            if destination_lat is not None:
                amb.destination_lat = destination_lat
            if destination_lng is not None:
                amb.destination_lng = destination_lng

            amb.last_telemetry_update = utc_now()
            await session.commit()
            await session.refresh(amb)
            return ambulance_to_dict(amb)


_fleet_adapter_instance = DatabaseSimulatedFleetAdapter()


def get_fleet_adapter() -> FleetAdapter:
    """Return the active FleetAdapter instance."""
    return _fleet_adapter_instance
