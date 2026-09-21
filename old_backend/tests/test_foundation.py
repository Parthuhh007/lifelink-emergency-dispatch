import pytest
from backend.app.core.config import settings
from backend.app.core.security import (
    UserRole,
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from backend.app.core.database import init_db
from backend.app.simulation.seed_data import seed_database, PUNE_HOSPITALS, PUNE_AMBULANCES


@pytest.mark.asyncio
async def test_security_hashing_and_jwt():
    raw_password = "superSecretPassword123"
    hashed = get_password_hash(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("wrongPassword", hashed) is False

    payload = {"sub": "user-pune-108", "role": UserRole.DISPATCHER.value}
    token = create_access_token(payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-pune-108"
    assert decoded["role"] == UserRole.DISPATCHER.value


@pytest.mark.asyncio
async def test_pune_database_and_seeding():
    await init_db()
    await seed_database()

    # Verify 14 Pune Hospitals and 12 EMS Ambulances
    assert len(PUNE_HOSPITALS) == 14
    assert len(PUNE_AMBULANCES) == 12

    # Check Sassoon General Hospital (Apex public trauma)
    sgh = next(h for h in PUNE_HOSPITALS if h["id"] == "HOSP-SGH-01")
    assert "Sassoon" in sgh["name"]
    assert sgh["trauma_level"] == "Level 1 Apex Public Trauma"
    assert sgh["has_burn_unit"] is True
    assert 18.52 < sgh["latitude"] < 18.54
    assert 73.86 < sgh["longitude"] < 73.88

    # Check Ruby Hall Clinic (Sassoon Rd)
    rhc = next(h for h in PUNE_HOSPITALS if h["id"] == "HOSP-RHC-02")
    assert rhc["has_cath_lab"] is True
    assert rhc["has_stroke_center"] is True

    # Check Indian EMS fleet distribution (8 BLS, 4 ALS)
    bls_units = [a for a in PUNE_AMBULANCES if a["capability"] == "BLS"]
    als_units = [a for a in PUNE_AMBULANCES if a["capability"] == "ALS"]
    assert len(bls_units) == 8
    assert len(als_units) == 4
