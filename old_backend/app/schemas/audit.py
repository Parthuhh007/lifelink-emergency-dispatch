from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    emergency_id: Optional[str] = None
    agent_name: str
    action: str
    tool_used: str = "InternalReasoning"
    input_payload: str
    output_payload: str
    reason: str
    confidence: float = 1.0
    human_approval_status: str = "NOT_REQUIRED"


class AuditLogResponse(BaseModel):
    id: str
    emergency_id: Optional[str] = None
    agent_name: str
    action: str
    tool_used: str
    input_payload: str
    output_payload: str
    reason: str
    confidence: float
    human_approval_status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
