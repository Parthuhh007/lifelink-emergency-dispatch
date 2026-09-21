import pytest
from backend.app.adapters.maps_adapter import get_maps_adapter, haversine_distance
from backend.app.adapters.hospital_adapter import get_hospital_adapter
from backend.app.adapters.fleet_adapter import get_fleet_adapter
from backend.app.core.database import init_db
from backend.app.simulation.seed_data import seed_database


@pytest.mark.asyncio
async def test_maps_adapter_real_pune_geography():
    maps = get_maps_adapter()

    # 1. Geocoding Pune address (FC Road / Deccan Gymkhana)
    geo_res = await maps.geocode("FC Road, Deccan Gymkhana, Pune, Maharashtra 411004")
    assert geo_res.latitude is not None
    assert geo_res.longitude is not None
    # Pune latitude approx 18.4 to 18.7, longitude approx 73.7 to 74.0
    assert 18.3 < geo_res.latitude < 18.8
    assert 73.6 < geo_res.longitude < 74.1

    # 2. Haversine distance between Swargate and Ruby Hall Clinic (~3.7 km)
    dist = haversine_distance(18.5018, 73.8636, 18.5328, 73.8770)
    assert 2.5 < dist < 5.0

    # 3. Directions & Real Route across Pune
    route = await maps.get_directions(18.5018, 73.8636, 18.5328, 73.8770)
    assert route.distance_km > 2.0
    assert route.duration_minutes > 1.0
    assert len(route.polyline_coords) >= 2


@pytest.mark.asyncio
async def test_pune_hospital_adapter():
    await init_db()
    await seed_database()

    hosp_adapter = get_hospital_adapter()
    hospitals = await hosp_adapter.get_all_hospitals()
    assert len(hospitals) >= 14

    # Test capacity update for Ruby Hall Clinic
    updated = await hosp_adapter.update_hospital_capacity(
        hospital_id="HOSP-RHC-02",
        icu_available=2,
        status="SURGE"
    )
    assert updated is not None
    assert updated["icu_available"] == 2
    assert updated["status"] == "SURGE"
    assert "staleness_seconds" in updated


@pytest.mark.asyncio
async def test_pune_fleet_adapter():
    await init_db()
    await seed_database()

    fleet_adapter = get_fleet_adapter()
    ambulances = await fleet_adapter.get_all_ambulances()
    assert len(ambulances) >= 12

    # Test 108 Swargate ambulance update
    updated = await fleet_adapter.update_ambulance_telemetry(
        ambulance_id="108-MH-PUNE-01",
        status="DISPATCHED",
        eta_minutes=8.0,
        lat=18.5050,
        lng=73.8650
    )
    assert updated is not None
    assert updated["status"] == "DISPATCHED"
    assert updated["eta_minutes"] == 8.0
    assert updated["current_lat"] == 18.5050
