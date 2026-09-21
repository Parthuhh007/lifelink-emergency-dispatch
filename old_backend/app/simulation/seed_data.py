import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.security import get_password_hash, UserRole
from ..core.database import async_session_factory
from ..models.user import User
from ..models.hospital import Hospital
from ..models.ambulance import Ambulance

logger = logging.getLogger("lifelink.seed")

# Real-world Pune Hospitals (14 Facilities across PMC and PCMC)
PUNE_HOSPITALS = [
    {
        "id": "HOSP-SGH-01",
        "name": "Sassoon General Hospital & B.J. Government Medical College",
        "address": "Station Rd / J.P. Narayan Rd, Near Pune Junction, Pune, Maharashtra 411001",
        "latitude": 18.5265,
        "longitude": 73.8705,
        "trauma_level": "Level 1 Apex Public Trauma",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": True,
        "has_pediatric_icu": True,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 45,
        "icu_available": 12,
        "ed_beds_total": 120,
        "ed_beds_available": 38
    },
    {
        "id": "HOSP-RHC-02",
        "name": "Ruby Hall Clinic (Sassoon Road)",
        "address": "40 Sassoon Rd, Sangamvadi, Pune, Maharashtra 411001",
        "latitude": 18.5328,
        "longitude": 73.8770,
        "trauma_level": "Level 1 Adult",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 35,
        "icu_available": 8,
        "ed_beds_total": 60,
        "ed_beds_available": 22
    },
    {
        "id": "HOSP-RHW-03",
        "name": "Ruby Hall Clinic (Wanowrie)",
        "address": "59/6 Disney Park, Azad Nagar, Wanowrie, Pune, Maharashtra 411040",
        "latitude": 18.4870,
        "longitude": 73.8960,
        "trauma_level": "Level 2 Multispecialty",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 20,
        "icu_available": 5,
        "ed_beds_total": 35,
        "ed_beds_available": 12
    },
    {
        "id": "HOSP-RHH-04",
        "name": "Ruby Hall Clinic (Hinjawadi)",
        "address": "Rajiv Gandhi Infotech Park, MIDC Phase 1, Hinjawadi, Pune, Maharashtra 411057",
        "latitude": 18.5912,
        "longitude": 73.7388,
        "trauma_level": "Level 2 Emergency",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 18,
        "icu_available": 4,
        "ed_beds_total": 30,
        "ed_beds_available": 11
    },
    {
        "id": "HOSP-JEH-05",
        "name": "Jehangir Hospital",
        "address": "32 Sassoon Rd, Opp Pune Railway Station, Pune, Maharashtra 411001",
        "latitude": 18.5298,
        "longitude": 73.8762,
        "trauma_level": "Level 1 Adult",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 28,
        "icu_available": 6,
        "ed_beds_total": 50,
        "ed_beds_available": 18
    },
    {
        "id": "HOSP-DMH-06",
        "name": "Deenanath Mangeshkar Hospital & Research Center",
        "address": "Near Mhatre Bridge, Erandwane, Karve Rd, Pune, Maharashtra 411004",
        "latitude": 18.5028,
        "longitude": 73.8294,
        "trauma_level": "Level 1 Adult",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": True,
        "has_pediatric_icu": True,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 40,
        "icu_available": 10,
        "ed_beds_total": 70,
        "ed_beds_available": 25
    },
    {
        "id": "HOSP-KEM-07",
        "name": "K.E.M. Hospital Pune",
        "address": "489 Rasta Peth, Sardar Moodliar Rd, Pune, Maharashtra 411011",
        "latitude": 18.5218,
        "longitude": 73.8665,
        "trauma_level": "Level 1 Pediatric / General",
        "has_cath_lab": True,
        "has_stroke_center": False,
        "has_burn_unit": False,
        "has_pediatric_icu": True,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 26,
        "icu_available": 6,
        "ed_beds_total": 45,
        "ed_beds_available": 15
    },
    {
        "id": "HOSP-SAH-DEC-08",
        "name": "Sahyadri Super Speciality Hospital (Deccan)",
        "address": "Plot No. 30 C, Erandvane, Karve Rd, Deccan Gymkhana, Pune, Maharashtra 411004",
        "latitude": 18.5135,
        "longitude": 73.8398,
        "trauma_level": "Level 1 Neuro/Cardiac",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 24,
        "icu_available": 5,
        "ed_beds_total": 40,
        "ed_beds_available": 14
    },
    {
        "id": "HOSP-SAH-NAG-09",
        "name": "Sahyadri Super Speciality Hospital (Nagar Road)",
        "address": "Hermes Waves, Kalyani Nagar / Nagar Rd, Pune, Maharashtra 411006",
        "latitude": 18.5520,
        "longitude": 73.8965,
        "trauma_level": "Level 2 Emergency",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 20,
        "icu_available": 4,
        "ed_beds_total": 35,
        "ed_beds_available": 12
    },
    {
        "id": "HOSP-SAH-HAD-10",
        "name": "Sahyadri Super Speciality Hospital (Hadapsar)",
        "address": "Magarpatta City / Pune-Solapur Rd, Hadapsar, Pune, Maharashtra 411028",
        "latitude": 18.5085,
        "longitude": 73.9260,
        "trauma_level": "Level 2 Emergency",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 18,
        "icu_available": 4,
        "ed_beds_total": 30,
        "ed_beds_available": 10
    },
    {
        "id": "HOSP-ABMH-11",
        "name": "Aditya Birla Memorial Hospital",
        "address": "Aditya Birla Hospital Marg, Thergaon, Chinchwad, Pune, Maharashtra 411033",
        "latitude": 18.6210,
        "longitude": 73.7745,
        "trauma_level": "Level 1 Apex PCMC",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": True,
        "has_pediatric_icu": True,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 36,
        "icu_available": 9,
        "ed_beds_total": 65,
        "ed_beds_available": 24
    },
    {
        "id": "HOSP-BVH-12",
        "name": "Bharati Vidyapeeth Medical College & Hospital",
        "address": "Pune-Satara Rd, Dhankawadi, Pune, Maharashtra 411043",
        "latitude": 18.4575,
        "longitude": 73.8508,
        "trauma_level": "Level 1 Tertiary",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": True,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 28,
        "icu_available": 7,
        "ed_beds_total": 55,
        "ed_beds_available": 18
    },
    {
        "id": "HOSP-POONA-13",
        "name": "Poona Hospital and Research Centre",
        "address": "27 Sadashiv Peth, Near Alka Talkies, Pune, Maharashtra 411030",
        "latitude": 18.5110,
        "longitude": 73.8480,
        "trauma_level": "Level 2 Multispecialty",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 20,
        "icu_available": 4,
        "ed_beds_total": 35,
        "ed_beds_available": 11
    },
    {
        "id": "HOSP-NOBLE-14",
        "name": "Noble Hospital",
        "address": "153 Magarpatta City Rd, Hadapsar, Pune, Maharashtra 411013",
        "latitude": 18.5060,
        "longitude": 73.9310,
        "trauma_level": "Level 2 Emergency",
        "has_cath_lab": True,
        "has_stroke_center": True,
        "has_burn_unit": False,
        "has_pediatric_icu": False,
        "has_ct_scan": True,
        "has_mri": True,
        "status": "NORMAL",
        "icu_total": 22,
        "icu_available": 5,
        "ed_beds_total": 40,
        "ed_beds_available": 14
    }
]

# Realistic Pune EMS Fleet: 8 BLS units (EMT + Pilot) and 4 scarce ALS units (Doctor/Paramedic + EMT)
PUNE_AMBULANCES = [
    {"id": "108-MH-PUNE-01", "callsign": "108 Unit Swargate", "capability": "BLS", "lat": 18.5018, "lng": 73.8636, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-02", "callsign": "108 Unit Pune Junction", "capability": "BLS", "lat": 18.5285, "lng": 73.8740, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-03", "callsign": "108 Unit Kothrud Chowk", "capability": "BLS", "lat": 18.5074, "lng": 73.8077, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-04", "callsign": "108 Unit Hadapsar Gadital", "capability": "BLS", "lat": 18.5089, "lng": 73.9259, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-05", "callsign": "108 Unit Katraj Chowk", "capability": "BLS", "lat": 18.4575, "lng": 73.8677, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-06", "callsign": "108 Unit Viman Nagar", "capability": "BLS", "lat": 18.5679, "lng": 73.9143, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-07", "callsign": "108 Unit Baner High St", "capability": "BLS", "lat": 18.5590, "lng": 73.7868, "status": "AVAILABLE"},
    {"id": "108-MH-PUNE-08", "callsign": "108 Unit Aundh Parihar", "capability": "BLS", "lat": 18.5620, "lng": 73.8070, "status": "AVAILABLE"},
    {"id": "ALS-RHC-01",     "callsign": "Ruby Hall Critical ALS-1", "capability": "ALS", "lat": 18.5328, "lng": 73.8770, "status": "AVAILABLE"},
    {"id": "ALS-DMH-02",     "callsign": "Deenanath Mobile ICU ALS-2", "capability": "ALS", "lat": 18.5028, "lng": 73.8294, "status": "AVAILABLE"},
    {"id": "ALS-HINJ-03",    "callsign": "Hinjawadi Infotech ALS-3", "capability": "ALS", "lat": 18.5913, "lng": 73.7389, "status": "AVAILABLE"},
    {"id": "ALS-ABMH-04",    "callsign": "Aditya Birla Cardiac ALS-4", "capability": "ALS", "lat": 18.6210, "lng": 73.7745, "status": "AVAILABLE"},
]

# Seed Users across all 5 Authorized Roles (Pune, India Context)
SEED_USERS = [
    {
        "id": "USR-CALLER-01",
        "email": "caller@lifelink.org",
        "full_name": "Demo Emergency Caller",
        "role": UserRole.EMERGENCY_USER.value,
        "organization": "Public Caller (Pune)",
        "badge_id": None
    },
    {
        "id": "USR-MEDIC-02",
        "email": "paramedic@lifelink.org",
        "full_name": "EMT Rajesh Kulkarni & Pilot Sachin Shinde",
        "role": UserRole.AMBULANCE_CREW.value,
        "organization": "Maharashtra 108 EMRI EMS",
        "badge_id": "MH-108-PUNE-42"
    },
    {
        "id": "USR-DISP-03",
        "email": "dispatcher@lifelink.org",
        "full_name": "Sunita Patil, Senior Dispatcher",
        "role": UserRole.DISPATCHER.value,
        "organization": "Pune Emergency Operations Center (PMC)",
        "badge_id": "PMC-DISP-04"
    },
    {
        "id": "USR-NURSE-04",
        "email": "ed_nurse@lifelink.org",
        "full_name": "Dr. Ananya Joshi, ED Triage Head",
        "role": UserRole.HOSPITAL_STAFF.value,
        "organization": "Ruby Hall Clinic (Sassoon Rd)",
        "badge_id": "RHC-ED-01"
    },
    {
        "id": "USR-ADMIN-05",
        "email": "admin@lifelink.org",
        "full_name": "System Administrator",
        "role": UserRole.ADMINISTRATOR.value,
        "organization": "LIFELINK Healthcare Network (India)",
        "badge_id": "SYS-ADMIN-01"
    }
]


async def seed_database() -> None:
    """Populate database with real Pune hospitals, fleet, and test users."""
    async with async_session_factory() as session:
        # 1. Seed Pune Hospitals
        for h_data in PUNE_HOSPITALS:
            exists = await session.get(Hospital, h_data["id"])
            if not exists:
                hospital = Hospital(**h_data)
                session.add(hospital)

        # 2. Seed Pune EMS Ambulances
        for a_data in PUNE_AMBULANCES:
            exists = await session.get(Ambulance, a_data["id"])
            if not exists:
                amb = Ambulance(
                    id=a_data["id"],
                    callsign=a_data["callsign"],
                    capability=a_data["capability"],
                    status=a_data["status"],
                    current_lat=a_data["lat"],
                    current_lng=a_data["lng"]
                )
                session.add(amb)

        # 3. Seed Users
        hashed = get_password_hash("lifelink2026")
        for u_data in SEED_USERS:
            res = await session.execute(select(User).where(User.email == u_data["email"]))
            if not res.scalar_one_or_none():
                user = User(
                    id=u_data["id"],
                    email=u_data["email"],
                    hashed_password=hashed,
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    organization=u_data["organization"],
                    badge_id=u_data["badge_id"],
                    is_active=True
                )
                session.add(user)

        await session.commit()
        logger.info("Database successfully seeded with 14 Pune hospitals, fleet, and test users.")
