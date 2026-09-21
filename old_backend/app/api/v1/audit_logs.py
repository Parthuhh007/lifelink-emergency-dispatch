from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ...core.database import get_db
from ...models.audit import AuditLog
from ...schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    emergency_id: Optional[str] = Query(None, description="Filter logs by emergency ID"),
    agent_name: Optional[str] = Query(None, description="Filter logs by agent/actor"),
    limit: int = Query(50, ge=1, le=200, description="Max logs to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve immutable audit trail records in reverse chronological order.
    Every agent recommendation, human confirmation, and operational event is captured here.
    """
    query = select(AuditLog)
    if emergency_id:
        query = query.where(AuditLog.emergency_id == emergency_id)
    if agent_name:
        query = query.where(AuditLog.agent_name == agent_name)

    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()
