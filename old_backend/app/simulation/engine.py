import asyncio
import logging
import random
from typing import Optional, Callable, Dict, Any, List
from sqlalchemy import select
from ..core.config import settings
from ..core.database import async_session_factory, utc_now
from ..models.hospital import Hospital
from ..models.ambulance import Ambulance
from ..models.emergency import Emergency, TimelineEvent

logger = logging.getLogger("lifelink.simulation")


class SimulationEngine:
    """
    Digital Twin Simulation Engine.
    Simulates real-time hospital bed changes, dynamic ambulance movement along road corridors,
    and enables programmatic injection of critical emergency events (e.g. ICU capacity drops).
    """

    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.tick_interval = settings.SIMULATION_TICK_SECONDS
        self.broadcast_callback: Optional[Callable[[str, Dict[str, Any]], Any]] = None
        self._step_counter = 0

    def register_broadcast_callback(self, callback: Callable[[str, Dict[str, Any]], Any]):
        """Register a callback to emit WebSocket events on simulation changes."""
        self.broadcast_callback = callback

    async def start(self):
        """Start background simulation loop."""
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._simulation_loop())
        logger.info(f"Digital Twin Simulation Engine started (tick: {self.tick_interval}s).")

    async def stop(self):
        """Stop background simulation loop."""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Digital Twin Simulation Engine stopped.")

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(self.tick_interval)
                self._step_counter += 1
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation tick: {e}", exc_info=True)

    async def _tick(self):
        """Execute one simulation cycle."""
        async with async_session_factory() as session:
            # 1. Update Active Ambulances (move towards destination)
            amb_res = await session.execute(select(Ambulance).where(Ambulance.status.in_(["DISPATCHED", "EN_ROUTE_PATIENT", "TRANSPORTING"])))
            active_ambulances = amb_res.scalars().all()

            for amb in active_ambulances:
                if amb.destination_lat and amb.destination_lng:
                    d_lat = amb.destination_lat - amb.current_lat
                    d_lng = amb.destination_lng - amb.current_lng
                    dist_remaining = (d_lat**2 + d_lng**2) ** 0.5

                    if dist_remaining > 0.001:
                        # Advance 5% towards destination per tick
                        step = min(0.08, dist_remaining * 0.15)
                        amb.current_lat += (d_lat / dist_remaining) * step
                        amb.current_lng += (d_lng / dist_remaining) * step
                        amb.speed_kmh = round(random.uniform(38.0, 58.0), 1)
                        if amb.eta_minutes and amb.eta_minutes > 0.3:
                            amb.eta_minutes = max(0.1, round(amb.eta_minutes - 0.2, 1))
                    else:
                        # Arrived
                        amb.speed_kmh = 0.0
                        amb.eta_minutes = 0.0
                        if amb.status == "DISPATCHED" or amb.status == "EN_ROUTE_PATIENT":
                            amb.status = "ON_SCENE"
                        elif amb.status == "TRANSPORTING":
                            amb.status = "AVAILABLE"
                            amb.assigned_emergency_id = None
                            amb.destination_lat = None
                            amb.destination_lng = None

                    amb.last_telemetry_update = utc_now()

            # 2. Gentle Natural Fluctuation for Hospitals (every 4 ticks ~ 12s)
            if self._step_counter % 4 == 0:
                hosp_res = await session.execute(select(Hospital))
                hospitals = hosp_res.scalars().all()
                for h in hospitals:
                    if h.status == "NORMAL":
                        # Gentle small fluctuation in ED beds
                        delta = random.choice([-1, 0, 0, 1])
                        h.ed_beds_available = max(1, min(h.ed_beds_total, h.ed_beds_available + delta))
                        h.last_telemetry_update = utc_now()

            await session.commit()

            # 3. Broadcast telemetry update
            if self.broadcast_callback:
                # Fetch fresh summary to broadcast
                h_res = await session.execute(select(Hospital))
                all_h = [{"id": h.id, "name": h.name, "icu": h.icu_available, "ed": h.ed_beds_available, "status": h.status} for h in h_res.scalars().all()]
                a_res = await session.execute(select(Ambulance))
                all_a = [{"id": a.id, "callsign": a.callsign, "lat": a.current_lat, "lng": a.current_lng, "status": a.status, "eta": a.eta_minutes} for a in a_res.scalars().all()]

                payload = {
                    "type": "SIMULATION_TICK",
                    "step": self._step_counter,
                    "hospitals": all_h,
                    "ambulances": all_a,
                    "timestamp": utc_now().isoformat()
                }
                await self.broadcast_callback("telemetry", payload)

    async def inject_capacity_drop(self, hospital_id: str, icu_available: int = 0, status: str = "DIVERSION") -> Optional[Dict[str, Any]]:
        """
        Trigger the Section 10 critical scenario:
        A selected hospital suddenly drops ICU capacity (e.g. to 0) or goes on DIVERSION.
        """
        async with async_session_factory() as session:
            h = await session.get(Hospital, hospital_id)
            if not h:
                return None
            prev_icu = h.icu_available
            prev_status = h.status
            h.icu_available = icu_available
            h.status = status
            h.last_telemetry_update = utc_now()
            await session.commit()
            await session.refresh(h)

            logger.warning(
                f"[SIMULATION EVENT] Capacity drop injected for {h.name}: "
                f"ICU {prev_icu} -> {icu_available}, Status {prev_status} -> {status}"
            )

            # Broadcast high-priority alert
            if self.broadcast_callback:
                await self.broadcast_callback("alerts", {
                    "type": "HOSPITAL_CAPACITY_LOST",
                    "hospital_id": h.id,
                    "hospital_name": h.name,
                    "icu_available": h.icu_available,
                    "status": h.status,
                    "timestamp": utc_now().isoformat()
                })

            return {
                "hospital_id": h.id,
                "name": h.name,
                "previous_icu": prev_icu,
                "current_icu": h.icu_available,
                "previous_status": prev_status,
                "current_status": h.status
            }

    async def inject_traffic_delay(self, ambulance_id: str, additional_eta_minutes: float = 12.0) -> Optional[Dict[str, Any]]:
        """Inject significant traffic congestion along the active ambulance route."""
        async with async_session_factory() as session:
            amb = await session.get(Ambulance, ambulance_id)
            if not amb:
                return None
            prev_eta = amb.eta_minutes or 5.0
            amb.eta_minutes = prev_eta + additional_eta_minutes
            amb.speed_kmh = max(5.0, amb.speed_kmh * 0.3)
            amb.last_telemetry_update = utc_now()
            await session.commit()

            if self.broadcast_callback:
                await self.broadcast_callback("alerts", {
                    "type": "TRAFFIC_DELAY_DETECTED",
                    "ambulance_id": amb.id,
                    "callsign": amb.callsign,
                    "delay_minutes": additional_eta_minutes,
                    "new_eta": amb.eta_minutes,
                    "timestamp": utc_now().isoformat()
                })

            return {
                "ambulance_id": amb.id,
                "callsign": amb.callsign,
                "delay_minutes": additional_eta_minutes,
                "new_eta": amb.eta_minutes
            }


simulation_engine = SimulationEngine()
