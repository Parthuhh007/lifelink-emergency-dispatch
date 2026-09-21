import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ...core.database import get_db, utc_now
from ...models.emergency import Emergency, TimelineEvent
from ...models.audit import AuditLog
from ...adapters.fleet_adapter import get_fleet_adapter
from ...adapters.maps_adapter import get_maps_adapter
from ...schemas.ambulance import AmbulanceResponse, AmbulanceUpdateTelemetry
from .ws import ws_manager

router = APIRouter(prefix="/ambulances", tags=["Ambulances"])


@router.get("", response_model=List[AmbulanceResponse])
async def list_ambulances():
    """Retrieve telematics and status for the active fleet."""
    adapter = get_fleet_adapter()
    return await adapter.get_all_ambulances()


@router.get("/{ambulance_id}", response_model=AmbulanceResponse)
async def get_ambulance(ambulance_id: str):
    """Retrieve telemetry for a specific ambulance."""
    adapter = get_fleet_adapter()
    amb = await adapter.get_ambulance_by_id(ambulance_id)
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return amb


@router.patch("/{ambulance_id}/telemetry", response_model=AmbulanceResponse)
async def update_telemetry(ambulance_id: str, payload: AmbulanceUpdateTelemetry):
    """Update vehicle telematics or operational status."""
    adapter = get_fleet_adapter()
    updated = await adapter.update_ambulance_telemetry(
        ambulance_id=ambulance_id,
        status=payload.status,
        lat=payload.current_lat,
        lng=payload.current_lng,
        eta_minutes=payload.eta_minutes,
        assigned_emergency_id=payload.assigned_emergency_id,
        heading=payload.heading,
        speed_kmh=payload.speed_kmh,
        destination_lat=payload.destination_lat,
        destination_lng=payload.destination_lng
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    await ws_manager.broadcast("ambulance_update", updated)
    return updated


class DispatchRequest(BaseModel):
    emergency_id: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    assigned_hospital_id: Optional[str] = None


@router.post("/{ambulance_id}/dispatch")
async def dispatch_ambulance(
    ambulance_id: str,
    payload: DispatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatch an ambulance to an active emergency.
    Calculates road routing and ETA via MapsAdapter, updates ambulance telemetry,
    attaches ambulance to emergency, records a timeline event, and records an audit log.
    """
    fleet_adapter = get_fleet_adapter()
    maps_adapter = get_maps_adapter()

    amb = await fleet_adapter.get_ambulance_by_id(ambulance_id)
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    # Fetch emergency
    res = await db.execute(
        select(Emergency).where(Emergency.id == payload.emergency_id)
    )
    emergency = res.scalar_one_or_none()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    dest_lat = payload.destination_lat or emergency.latitude
    dest_lng = payload.destination_lng or emergency.longitude

    # Compute realistic driving route & ETA
    route = await maps_adapter.get_directions(
        amb["current_lat"], amb["current_lng"],
        dest_lat, dest_lng
    )

    # Update ambulance telemetry
    updated_amb = await fleet_adapter.update_ambulance_telemetry(
        ambulance_id=ambulance_id,
        status="DISPATCHED",
        assigned_emergency_id=emergency.id,
        destination_lat=dest_lat,
        destination_lng=dest_lng,
        eta_minutes=round(route.duration_minutes, 1)
    )

    # Update emergency record
    emergency.status = "DISPATCHED"
    emergency.assigned_ambulance_id = ambulance_id
    if payload.assigned_hospital_id:
        emergency.assigned_hospital_id = payload.assigned_hospital_id
    emergency.route_eta_minutes = round(route.duration_minutes, 1)

    # Add Timeline Event
    timeline = TimelineEvent(
        emergency_id=emergency.id,
        event_type="DISPATCH_ASSIGNED",
        agent_name="DispatcherConsole",
        title="Ambulance Dispatched",
        description=f"{amb['callsign']} ({amb['capability']}) dispatched. Est. distance: {round(route.distance_km, 1)} km, ETA: {round(route.duration_minutes, 1)} min.",
        metadata_json=json.dumps({
            "ambulance_id": ambulance_id,
            "callsign": amb["callsign"],
            "capability": amb["capability"],
            "distance_km": round(route.distance_km, 1),
            "eta_minutes": round(route.duration_minutes, 1),
            "assigned_hospital_id": payload.assigned_hospital_id
        })
    )
    db.add(timeline)

    # Add Audit Log
    audit = AuditLog(
        emergency_id=emergency.id,
        agent_name="DispatcherConsole",
        action="AMBULANCE_DISPATCH",
        tool_used="FleetAdapter.dispatch",
        input_payload=json.dumps({
            "ambulance_id": ambulance_id,
            "emergency_id": emergency.id,
            "dest_lat": dest_lat,
            "dest_lng": dest_lng
        }),
        output_payload=json.dumps({
            "status": "DISPATCHED",
            "eta_minutes": round(route.duration_minutes, 1),
            "distance_km": round(route.distance_km, 1)
        }),
        reason=f"Operator dispatched nearest available unit {amb['callsign']}.",
        confidence=1.0,
        human_approval_status="APPROVED"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(emergency)

    # WebSocket Broadcasts
    await ws_manager.broadcast("ambulance_update", updated_amb)
    await ws_manager.broadcast("dispatch_event", {
        "emergency_id": emergency.id,
        "ambulance_id": ambulance_id,
        "callsign": amb["callsign"],
        "status": "DISPATCHED",
        "eta_minutes": round(route.duration_minutes, 1),
        "distance_km": round(route.distance_km, 1),
        "polyline_coords": route.polyline_coords,
        "timestamp": utc_now().isoformat()
    })

    return {
        "status": "SUCCESS",
        "ambulance": updated_amb,
        "emergency_id": emergency.id,
        "route": {
            "distance_km": round(route.distance_km, 1),
            "duration_minutes": round(route.duration_minutes, 1),
            "polyline_coords": route.polyline_coords,
            "provider": route.provider
        }
    }

