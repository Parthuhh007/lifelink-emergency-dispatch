import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ...core.database import get_db, utc_now
from ...models.emergency import Emergency, TimelineEvent
from ...models.audit import AuditLog
from ...schemas.emergency import EmergencyCreate, EmergencyResponse, HumanConfirmationRequest, TimelineEventResponse
from ...adapters.maps_adapter import get_maps_adapter
from .ws import ws_manager

router = APIRouter(prefix="/emergencies", tags=["Emergencies"])


@router.post("", response_model=EmergencyResponse, status_code=201)
async def create_emergency(payload: EmergencyCreate, db: AsyncSession = Depends(get_db)):
    """
    Intake a new emergency call or bystander request.
    Geolocates the address via MapsAdapter, persists the emergency,
    creates the initial timeline event, and records an audit log.
    """
    maps_adapter = get_maps_adapter()

    # Determine real coordinates
    lat = payload.latitude
    lng = payload.longitude
    formatted_address = payload.address

    if lat is None or lng is None:
        geocode_res = await maps_adapter.geocode(payload.address)
        lat = geocode_res.latitude
        lng = geocode_res.longitude
        formatted_address = geocode_res.formatted_address

    # Create Emergency instance
    emergency = Emergency(
        caller_name=payload.caller_name or "Anonymous Bystander",
        caller_phone=payload.caller_phone or "555-0100",
        address=formatted_address,
        latitude=lat,
        longitude=lng,
        chief_complaint=payload.chief_complaint,
        reported_symptoms_json=json.dumps(payload.reported_symptoms or {}),
        status="REPORTED",
        human_confirmation_status="SYSTEM_GENERATED",
        preliminary_urgency="LEVEL_3_URGENT"  # Default baseline before Triage Agent runs
    )
    db.add(emergency)
    await db.flush()

    # Initial Timeline Event
    init_event = TimelineEvent(
        emergency_id=emergency.id,
        event_type="INTAKE_REGISTERED",
        agent_name="DispatcherGateway",
        title="Emergency Call Registered",
        description=f"Incident intake registered at {formatted_address}. Chief complaint: {payload.chief_complaint}",
        metadata_json=json.dumps({
            "caller": emergency.caller_name,
            "latitude": lat,
            "longitude": lng,
            "raw_symptoms": payload.reported_symptoms or {}
        })
    )
    db.add(init_event)

    # Immutable Audit Log
    audit = AuditLog(
        emergency_id=emergency.id,
        agent_name="DispatcherGateway",
        action="INTAKE_CREATION",
        tool_used="MapsAdapter.geocode",
        input_payload=json.dumps({"address": payload.address, "complaint": payload.chief_complaint}),
        output_payload=json.dumps({"emergency_id": emergency.id, "lat": lat, "lng": lng, "address": formatted_address}),
        reason="Emergency incident intake received and geocoded with real spatial coordinates.",
        confidence=1.0,
        human_approval_status="NOT_REQUIRED"
    )
    db.add(audit)

    await db.commit()

    # Re-fetch with timeline relationship
    res = await db.execute(
        select(Emergency)
        .options(selectinload(Emergency.timeline_events))
        .where(Emergency.id == emergency.id)
    )
    saved_emergency = res.scalar_one()

    # Broadcast new emergency event to connected dashboards
    await ws_manager.broadcast("new_emergency", {
        "id": saved_emergency.id,
        "tracking_code": saved_emergency.tracking_code,
        "address": saved_emergency.address,
        "latitude": saved_emergency.latitude,
        "longitude": saved_emergency.longitude,
        "chief_complaint": saved_emergency.chief_complaint,
        "status": saved_emergency.status,
        "created_at": saved_emergency.created_at.isoformat()
    })

    return saved_emergency


@router.get("", response_model=List[EmergencyResponse])
async def list_emergencies(db: AsyncSession = Depends(get_db)):
    """Retrieve list of all active and recent emergencies."""
    res = await db.execute(
        select(Emergency)
        .options(selectinload(Emergency.timeline_events))
        .order_by(Emergency.created_at.desc())
    )
    return res.scalars().all()


@router.get("/{emergency_id}", response_model=EmergencyResponse)
async def get_emergency(emergency_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full details and chronological timeline for an emergency."""
    res = await db.execute(
        select(Emergency)
        .options(selectinload(Emergency.timeline_events))
        .where(Emergency.id == emergency_id)
    )
    emergency = res.scalar_one_or_none()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return emergency


@router.post("/{emergency_id}/confirm", response_model=EmergencyResponse)
async def confirm_emergency_action(
    emergency_id: str,
    payload: HumanConfirmationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Human-in-the-Loop Confirmation Gate:
    Authorized clinician/dispatcher approves, rejects, or overrides an AI recommendation.
    """
    res = await db.execute(
        select(Emergency)
        .options(selectinload(Emergency.timeline_events))
        .where(Emergency.id == emergency_id)
    )
    emergency = res.scalar_one_or_none()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    decision = payload.decision.upper()
    if decision not in ["APPROVED", "REJECTED", "OVERRIDDEN"]:
        raise HTTPException(status_code=400, detail="Decision must be APPROVED, REJECTED, or OVERRIDDEN")

    prev_status = emergency.human_confirmation_status
    emergency.human_confirmation_status = decision
    if payload.clinician_notes:
        emergency.clinician_confirmed_notes = payload.clinician_notes
    if decision == "OVERRIDDEN" and payload.override_hospital_id:
        emergency.assigned_hospital_id = payload.override_hospital_id

    # Record Timeline Event
    event = TimelineEvent(
        emergency_id=emergency.id,
        event_type="HUMAN_CONFIRMATION_RECORDED",
        agent_name="HumanClinician",
        title=f"Recommendation {decision}",
        description=f"Authorized human clinician recorded decision: {decision}. Notes: {payload.clinician_notes or 'No additional notes provided.'}",
        metadata_json=json.dumps({
            "previous_status": prev_status,
            "decision": decision,
            "override_hospital_id": payload.override_hospital_id
        })
    )
    db.add(event)

    # Record Audit Log
    audit = AuditLog(
        emergency_id=emergency.id,
        agent_name="HumanClinician",
        action="HUMAN_APPROVAL_DECISION",
        tool_used="HumanConfirmationGate",
        input_payload=json.dumps(payload.model_dump()),
        output_payload=json.dumps({"emergency_id": emergency.id, "final_status": decision}),
        reason="Clinician exercised human-in-the-loop oversight.",
        confidence=1.0,
        human_approval_status=decision
    )
    db.add(audit)

    await db.commit()
    await db.refresh(emergency)

    await ws_manager.broadcast("human_confirmation", {
        "emergency_id": emergency.id,
        "decision": decision,
        "status": emergency.status,
        "timestamp": utc_now().isoformat()
    })

    return emergency
