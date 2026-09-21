from fastapi import APIRouter
from .auth import router as auth_router
from .hospitals import router as hospitals_router
from .ambulances import router as ambulances_router
from .emergencies import router as emergencies_router
from .simulation import router as simulation_router
from .audit_logs import router as audit_logs_router
from .maps import router as maps_router
from .response_teams import router as response_teams_router
from .ws import websocket_endpoint

# Standard v1 Router mounted at /api/v1
api_v1_router = APIRouter(prefix="/v1")

for r in [
    auth_router,
    hospitals_router,
    ambulances_router,
    emergencies_router,
    simulation_router,
    audit_logs_router,
    maps_router,
    response_teams_router,
]:
    api_v1_router.include_router(r)

# Alias router for direct /api/... routes without v1 prefix
api_direct_router = APIRouter()
for r in [
    auth_router,
    hospitals_router,
    ambulances_router,
    emergencies_router,
    simulation_router,
    audit_logs_router,
    maps_router,
    response_teams_router,
]:
    api_direct_router.include_router(r)

__all__ = ["api_v1_router", "api_direct_router", "websocket_endpoint"]
