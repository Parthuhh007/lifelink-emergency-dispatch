"""
LIFELINK — Main Bootstrap & Server Launcher.
"""
import sys
import uvicorn
from backend.app.core.config import settings

if __name__ == "__main__":
    print("=" * 70)
    print(f"  Starting {settings.APP_NAME} Emergency Response Platform v{settings.APP_VERSION}")
    print(f"  Environment: {settings.APP_ENV}")
    print(f"  City Archetype: {settings.DEFAULT_CITY} (Real Chicago Geography)")
    print(f"  Maps Provider: {settings.MAPS_PROVIDER.upper()}")
    print(f"  Console UI: http://localhost:{settings.PORT}")
    print(f"  API Docs:   http://localhost:{settings.PORT}/docs")
    print(f"  WebSocket:  ws://localhost:{settings.PORT}/ws")
    print("=" * 70)

    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=False,
        log_level="info"
    )
