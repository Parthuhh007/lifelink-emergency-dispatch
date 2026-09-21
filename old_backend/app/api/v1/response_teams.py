from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from ...adapters.fleet_adapter import get_fleet_adapter

router = APIRouter(prefix="/response-teams", tags=["Response Teams"])


class ResponseTeamMember(BaseModel):
    name: str
    role: str
    contact: str


class ResponseTeamResponse(BaseModel):
    id: str
    name: str
    team_type: str  # BLS_CREW, ALS_CRITICAL_CARE, QUICK_REACTION_TEAM, MOBILE_ICU, DISASTER_RESCUE
    status: str     # ON_DUTY, DISPATCHED, EN_ROUTE, ON_SCENE, STANDBY, OFF_DUTY
    base_station: str
    current_lat: float
    current_lng: float
    assigned_vehicle_id: Optional[str] = None
    assigned_emergency_id: Optional[str] = None
    members: List[ResponseTeamMember]
    specialization: str
    equipment_level: str


# Static team definitions mapped dynamically to fleet vehicles
TEAM_TEMPLATES = [
    {
        "id": "TEAM-108-SWARGATE",
        "name": "108 Rapid EMT Crew Swargate",
        "team_type": "BLS_CREW",
        "base_station": "Swargate ST Stand, Pune 411042",
        "vehicle_id": "108-MH-PUNE-01",
        "specialization": "Basic Life Support & Trauma Stabilization",
        "equipment_level": "Automated External Defibrillator (AED), Oxygen, Splints, Stretcher",
        "members": [
            {"name": "Rajesh Kulkarni", "role": "Emergency Medical Technician (EMT)", "contact": "+91 98220 11001"},
            {"name": "Sachin Shinde", "role": "Ambulance Pilot", "contact": "+91 98220 11002"}
        ]
    },
    {
        "id": "TEAM-108-JUNCTION",
        "name": "108 Rapid EMT Crew Pune Junction",
        "team_type": "BLS_CREW",
        "base_station": "Pune Junction Station Yard, Pune 411001",
        "vehicle_id": "108-MH-PUNE-02",
        "specialization": "Railway & High-Transit Public First Response",
        "equipment_level": "AED, Multi-parameter Vital Monitor, Trauma Kit",
        "members": [
            {"name": "Vikas Jadhav", "role": "Lead Paramedic", "contact": "+91 98220 11003"},
            {"name": "Pravin More", "role": "Ambulance Pilot", "contact": "+91 98220 11004"}
        ]
    },
    {
        "id": "TEAM-ALS-RUBY-01",
        "name": "Ruby Hall Critical Care ALS Team",
        "team_type": "ALS_CRITICAL_CARE",
        "base_station": "Ruby Hall Clinic, Sassoon Rd, Pune 411001",
        "vehicle_id": "ALS-RHC-01",
        "specialization": "Advanced Cardiac Life Support (ACLS) & Cath Lab Bridge",
        "equipment_level": "Transport Ventilator, 12-Lead Tele-ECG, Defibrillator, Cardiac Meds",
        "members": [
            {"name": "Dr. Pradeep Deshmukh", "role": "Emergency Physician", "contact": "+91 98220 11005"},
            {"name": "Sister Sneha Kamble", "role": "Critical Care Flight Nurse", "contact": "+91 98220 11006"},
            {"name": "Mahesh Pawar", "role": "Trained EMS Pilot", "contact": "+91 98220 11007"}
        ]
    },
    {
        "id": "TEAM-ALS-DMH-02",
        "name": "Deenanath Mobile ICU Shock Team",
        "team_type": "MOBILE_ICU",
        "base_station": "Deenanath Mangeshkar Hospital, Erandwane, Pune 411004",
        "vehicle_id": "ALS-DMH-02",
        "specialization": "Polytrauma Resuscitation & Mobile Critical Care",
        "equipment_level": "Infusion Pumps, Arterial Line Setup, Portable Ultrasound, Ventilator",
        "members": [
            {"name": "Dr. Amit Bapat", "role": "Intensivist / Anesthetist", "contact": "+91 98220 11008"},
            {"name": "EMT Santosh Gaikwad", "role": "Paramedic Level II", "contact": "+91 98220 11009"},
            {"name": "Ganesh Walke", "role": "Ambulance Pilot", "contact": "+91 98220 11010"}
        ]
    },
    {
        "id": "TEAM-108-KOTHRUD",
        "name": "108 EMT Crew Kothrud",
        "team_type": "BLS_CREW",
        "base_station": "Paud Rd / Karve Statue, Kothrud, Pune 411038",
        "vehicle_id": "108-MH-PUNE-03",
        "specialization": "Geriatric Emergencies & Cardiac First Response",
        "equipment_level": "Suction Unit, O2 Therapy, Cervical Collars, Wheelchair Stretcher",
        "members": [
            {"name": "Anil Jagtap", "role": "EMT Specialist", "contact": "+91 98220 11011"},
            {"name": "Sunil Date", "role": "Ambulance Pilot", "contact": "+91 98220 11012"}
        ]
    },
    {
        "id": "TEAM-ALS-HINJ-03",
        "name": "Hinjawadi IT Corridor Rapid ALS Team",
        "team_type": "ALS_CRITICAL_CARE",
        "base_station": "Rajiv Gandhi Infotech Park Phase 1, Hinjawadi 411057",
        "vehicle_id": "ALS-HINJ-03",
        "specialization": "Industrial Hazards, Expressway Trauma, Stroke Triage",
        "equipment_level": "Digital Stroke Assessment Suite, Ventilator, Burn Trauma Dressing",
        "members": [
            {"name": "Dr. Rohit Verma", "role": "Acute Care Physician", "contact": "+91 98220 11013"},
            {"name": "Tukaram Shinde", "role": "Paramedic", "contact": "+91 98220 11014"}
        ]
    },
    {
        "id": "TEAM-NDRF-PUNE",
        "name": "Pune Quick Disaster Rescue Unit (PMC-NDRF)",
        "team_type": "DISASTER_RESCUE",
        "base_station": "PMC Central Fire & Disaster Cell, Bhawani Peth, Pune",
        "vehicle_id": None,
        "specialization": "Search & Rescue, Multi-casualty Incident (MCI) Extraction",
        "equipment_level": "Hydraulic Cutters, Life Detectors, Triage Field Tarps, Decontamination",
        "members": [
            {"name": "Insp. Hemant Patil", "role": "Disaster Commander", "contact": "+91 98220 11015"},
            {"name": "Team Havaldar Suresh R.", "role": "Rescue Lead", "contact": "+91 98220 11016"}
        ]
    }
]


@router.get("", response_model=List[ResponseTeamResponse])
async def list_response_teams():
    """
    Retrieve all registered response teams and link their live status with fleet vehicles.
    """
    fleet_adapter = get_fleet_adapter()
    ambulances = await fleet_adapter.get_all_ambulances()
    amb_map = {a["id"]: a for a in ambulances}

    teams: List[ResponseTeamResponse] = []
    for tmpl in TEAM_TEMPLATES:
        veh_id = tmpl["vehicle_id"]
        amb = amb_map.get(veh_id) if veh_id else None

        if amb:
            current_lat = amb["current_lat"]
            current_lng = amb["current_lng"]
            status = "ON_DUTY" if amb["status"] == "AVAILABLE" else amb["status"]
            assigned_emergency_id = amb.get("assigned_emergency_id")
        else:
            current_lat = 18.5030
            current_lng = 73.8640
            status = "STANDBY"
            assigned_emergency_id = None

        teams.append(
            ResponseTeamResponse(
                id=tmpl["id"],
                name=tmpl["name"],
                team_type=tmpl["team_type"],
                status=status,
                base_station=tmpl["base_station"],
                current_lat=current_lat,
                current_lng=current_lng,
                assigned_vehicle_id=veh_id,
                assigned_emergency_id=assigned_emergency_id,
                members=[ResponseTeamMember(**m) for m in tmpl["members"]],
                specialization=tmpl["specialization"],
                equipment_level=tmpl["equipment_level"]
            )
        )

    return teams
