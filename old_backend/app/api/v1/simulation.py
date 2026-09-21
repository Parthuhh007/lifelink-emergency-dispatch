from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, HTTPException
from ...simulation.engine import simulation_engine

router = APIRouter(prefix="/simulation", tags=["Simulation Controls"])


class CapacityDropRequest(BaseModel):
    hospital_id: str
    icu_available: int = 0
    status: str = "DIVERSION"


class TrafficDelayRequest(BaseModel):
    ambulance_id: str
    delay_minutes: float = 12.0


@router.post("/inject/capacity-drop")
async def inject_capacity_drop(req: CapacityDropRequest):
    """
    Inject a dynamic hospital capacity drop (Section 10 Scenario).
    Reduces hospital ICU beds and/or triggers DIVERSION status.
    """
    result = await simulation_engine.inject_capacity_drop(
        hospital_id=req.hospital_id,
        icu_available=req.icu_available,
        status=req.status
    )
    if not result:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {"status": "SUCCESS", "event": "CAPACITY_DROP_INJECTED", "details": result}


@router.post("/inject/traffic-delay")
async def inject_traffic_delay(req: TrafficDelayRequest):
    """Inject unexpected traffic delay along active ambulance route."""
    result = await simulation_engine.inject_traffic_delay(
        ambulance_id=req.ambulance_id,
        additional_eta_minutes=req.delay_minutes
    )
    if not result:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return {"status": "SUCCESS", "event": "TRAFFIC_DELAY_INJECTED", "details": result}


@router.get("/status")
async def get_simulation_status():
    """Get current simulation engine state."""
    return {
        "is_running": simulation_engine.is_running,
        "tick_interval_seconds": simulation_engine.tick_interval,
        "step_counter": simulation_engine._step_counter
    }


@router.post("/start")
async def start_simulation():
    """Start background simulation engine."""
    await simulation_engine.start()
    return {"status": "STARTED"}


@router.post("/stop")
async def stop_simulation():
    """Stop background simulation engine."""
    await simulation_engine.stop()
    return {"status": "STOPPED"}
