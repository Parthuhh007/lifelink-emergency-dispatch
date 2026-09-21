import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .core.database import init_db
from .simulation.seed_data import seed_database
from .simulation.engine import simulation_engine
from .api.v1 import api_v1_router, api_direct_router, websocket_endpoint
from .api.v1.ws import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_database()
    simulation_engine.register_broadcast_callback(ws_manager.broadcast)
    if settings.SIMULATION_ENABLED:
        await simulation_engine.start()
    yield
    # Shutdown
    await simulation_engine.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Agentic AI Emergency Response & Coordination Platform",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Endpoint
app.add_api_websocket_route("/ws", websocket_endpoint)

# API Routers (/api/v1/... and /api/...)
app.include_router(api_v1_router, prefix="/api")
app.include_router(api_direct_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "maps_provider": settings.MAPS_PROVIDER,
        "simulation_running": simulation_engine.is_running
    }


# Mount static directory for Phase 1 Operational UI
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
