import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db
from backend.app.simulation.seed_data import seed_database


@pytest.mark.asyncio
async def test_audit_logs_and_response_teams():
    await init_db()
    await seed_database()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test audit logs endpoint
        res = await client.get("/api/v1/audit-logs")
        assert res.status_code == 200
        logs = res.json()
        assert isinstance(logs, list)

        # Test response teams endpoint
        res = await client.get("/api/v1/response-teams")
        assert res.status_code == 200
        teams = res.json()
        assert len(teams) >= 5
        assert teams[0]["name"] is not None
        assert teams[0]["team_type"] in ["BLS_CREW", "ALS_CRITICAL_CARE", "MOBILE_ICU", "DISASTER_RESCUE"]


@pytest.mark.asyncio
async def test_maps_routing_and_reverse_geocode():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Swargate to Deccan Gymkhana
        res = await client.get("/api/v1/maps/route?origin_lat=18.5018&origin_lng=73.8636&dest_lat=18.5135&dest_lng=73.8398")
        assert res.status_code == 200
        data = res.json()
        assert data["distance_km"] > 0
        assert data["duration_minutes"] > 0
        assert len(data["polyline_coords"]) >= 2

        # Reverse geocode Pune Center
        res = await client.get("/api/v1/maps/reverse-geocode?lat=18.5204&lng=73.8567")
        assert res.status_code == 200
        geo = res.json()
        assert "formatted_address" in geo


@pytest.mark.asyncio
async def test_ambulance_dispatch_endpoint():
    await init_db()
    await seed_database()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch active emergency
        res = await client.get("/api/v1/emergencies")
        assert res.status_code == 200
        emergencies = res.json()
        assert len(emergencies) > 0
        emg_id = emergencies[0]["id"]

        # 2. Dispatch ambulance
        dispatch_payload = {
            "emergency_id": emg_id,
            "assigned_hospital_id": "HOSP-SGH-01"
        }
        dispatch_res = await client.post("/api/v1/ambulances/108-MH-PUNE-01/dispatch", json=dispatch_payload)
        assert dispatch_res.status_code == 200
        d_data = dispatch_res.json()
        assert d_data["status"] == "SUCCESS"
        assert d_data["ambulance"]["status"] == "DISPATCHED"
        assert d_data["ambulance"]["assigned_emergency_id"] == emg_id
        assert "polyline_coords" in d_data["route"]
