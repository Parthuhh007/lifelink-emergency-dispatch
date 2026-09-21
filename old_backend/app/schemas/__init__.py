"""
Pydantic schemas for LIFELINK.
"""
from .auth import UserCreate, UserResponse, TokenResponse, LoginRequest
from .hospital import HospitalBase, HospitalResponse, HospitalUpdateCapacity
from .ambulance import AmbulanceBase, AmbulanceResponse, AmbulanceUpdateTelemetry
from .emergency import EmergencyCreate, EmergencyResponse, TimelineEventResponse, HumanConfirmationRequest
from .audit import AuditLogCreate, AuditLogResponse

__all__ = [
    "UserCreate",
    "UserResponse",
    "TokenResponse",
    "LoginRequest",
    "HospitalBase",
    "HospitalResponse",
    "HospitalUpdateCapacity",
    "AmbulanceBase",
    "AmbulanceResponse",
    "AmbulanceUpdateTelemetry",
    "EmergencyCreate",
    "EmergencyResponse",
    "TimelineEventResponse",
    "HumanConfirmationRequest",
    "AuditLogCreate",
    "AuditLogResponse",
]
