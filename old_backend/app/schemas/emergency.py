from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class EmergencyCreate(BaseModel):
    caller_name: Optional[str] = "Anonymous Bystander"
    caller_phone: Optional[str] = "555-0100"
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    chief_complaint: str
    reported_symptoms: Optional[Dict[str, Any]] = None


class TimelineEventResponse(BaseModel):
    id: str
    emergency_id: str
    event_type: str
    agent_name: str
    title: str
    description: str
    metadata_json: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmergencyResponse(BaseModel):
    id: str
    tracking_code: str
    status: str
    human_confirmation_status: str
    caller_name: str
    caller_phone: str
    address: str
    latitude: float
    longitude: float
    chief_complaint: str
    reported_symptoms_json: str
    preliminary_urgency: str
    assigned_ambulance_id: Optional[str] = None
    assigned_hospital_id: Optional[str] = None
    backup_hospital_id: Optional[str] = None
    route_eta_minutes: Optional[float] = None
    recommended_reasoning: Optional[str] = None
    clinician_confirmed_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timeline_events: Optional[List[TimelineEventResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class HumanConfirmationRequest(BaseModel):
    decision: str  # APPROVED, REJECTED, OVERRIDDEN
    clinician_notes: Optional[str] = None
    override_hospital_id: Optional[str] = None
