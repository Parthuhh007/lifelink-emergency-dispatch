import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from backend.app.main import app
from backend.app.core.database import init_db, async_session_factory
from backend.app.simulation.seed_data import seed_database
from backend.app.models.audit import AuditLog
from backend.app.models.emergency import Emergency, TimelineEvent


@pytest.mark.asyncio
async def test_emergency_intake_and_audit():
    await init_db()
    await seed_database()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Emergency Intake in Pune (FC Road / Deccan)
        payload = {
            "caller_name": "Rohan Deshmukh",
            "caller_phone": "+91 98220 11234",
            "address": "FC Road, Near Goodluck Cafe, Deccan Gymkhana, Pune, Maharashtra 411004",
            "chief_complaint": "Acute crushing chest pain radiating to left arm and jaw, diaphoresis.",
            "reported_symptoms": {
                "chest_pain": True,
                "shortness_of_breath": True,
                "conscious": True
            }
        }
        res = await client.post("/api/v1/emergencies", json=payload)
        assert res.status_code == 201
        data = res.json()

        assert "id" in data
        assert data["tracking_code"].startswith("LL-")
        assert data["status"] == "REPORTED"
        assert data["human_confirmation_status"] == "SYSTEM_GENERATED"
        assert data["latitude"] is not None
        assert data["longitude"] is not None
        assert len(data["timeline_events"]) >= 1

        emergency_id = data["id"]

        # 2. Verify Audit Log was recorded in DB
        async with async_session_factory() as session:
            audit_res = await session.execute(
                select(AuditLog).where(AuditLog.emergency_id == emergency_id)
            )
            logs = audit_res.scalars().all()
            assert len(logs) >= 1
            assert logs[0].agent_name == "DispatcherGateway"
            assert logs[0].action == "INTAKE_CREATION"
            assert "MapsAdapter" in logs[0].tool_used

        # 3. Test Human-in-the-loop Confirmation Gate
        confirm_payload = {
            "decision": "APPROVED",
            "clinician_notes": "Triage priority approved by 108 Pune dispatch supervisor."
        }
        confirm_res = await client.post(f"/api/v1/emergencies/{emergency_id}/confirm", json=confirm_payload)
        assert confirm_res.status_code == 200
        confirmed_data = confirm_res.json()
        assert confirmed_data["human_confirmation_status"] == "APPROVED"
        assert confirmed_data["clinician_confirmed_notes"] == "Triage priority approved by 108 Pune dispatch supervisor."

        # Verify new timeline event was added
        assert len(confirmed_data["timeline_events"]) >= 2


@pytest.mark.asyncio
async def test_simulation_capacity_drop_injection():
    await init_db()
    await seed_database()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Inject critical ICU capacity drop for Ruby Hall Clinic Sassoon Rd
        drop_payload = {
            "hospital_id": "HOSP-RHC-02",
            "icu_available": 0,
            "status": "DIVERSION"
        }
        res = await client.post("/api/v1/simulation/inject/capacity-drop", json=drop_payload)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["details"]["current_icu"] == 0
        assert res_data["details"]["current_status"] == "DIVERSION"

        # Verify hospital status reflects change
        hosp_res = await client.get("/api/v1/hospitals/HOSP-RHC-02")
        assert hosp_res.status_code == 200
        hosp = hosp_res.json()
        assert hosp["icu_available"] == 0
        assert hosp["status"] == "DIVERSION"
