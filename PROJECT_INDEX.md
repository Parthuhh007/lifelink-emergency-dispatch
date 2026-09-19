# LIFELINK — Project Master Index & File Catalog

This file catalogs every file created in LIFELINK, organized by architectural layer, complete with absolute paths, file links, and key exports.

---

## 🌐 Quick Access URLs

- **Console Web App**: [http://localhost:8000](http://localhost:8000)
- **API Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc Docs**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **System Health Status**: [http://localhost:8000/health](http://localhost:8000/health)
- **WebSocket Gateway**: `ws://localhost:8000/ws`
- **Hospitals API**: [http://localhost:8000/api/v1/hospitals](http://localhost:8000/api/v1/hospitals)
- **Ambulances API**: [http://localhost:8000/api/v1/ambulances](http://localhost:8000/api/v1/ambulances)
- **Emergencies API**: [http://localhost:8000/api/v1/emergencies](http://localhost:8000/api/v1/emergencies)
- **Demo Auth Tokens**: [http://localhost:8000/api/v1/auth/demo-tokens](http://localhost:8000/api/v1/auth/demo-tokens)

---

## 📁 Root Configuration Files

| File | Link | Purpose & Highlights |
| :--- | :--- | :--- |
| `README.md` | [`README.md`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/README.md) | Primary project readme, quickstart guide, live links, and architectural summary. |
| `AGENTS.md` | [`AGENTS.md`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/AGENTS.md) | Mandatory multi-agent operating rules: zero autonomous medical diagnosis, human confirmation state machine, IST timezone presentation, Indian EMS BLS/ALS realities, and emergency numbers (112, 108, 102). |
| `run.py` | [`run.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/run.py) | Server bootstrapper. Starts Uvicorn ASGI server on port 8000. |
| `requirements.txt` | [`requirements.txt`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/requirements.txt) | Python dependencies (`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `aiosqlite`, `websockets`, `httpx`, `pytest`, `bcrypt`, `pyjwt`). |
| `.env.example` | [`.env.example`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/.env.example) | Environment variable template (Database URL, JWT secret, Maps Provider, Simulation settings). |

---

## 📁 Core Infrastructure (`backend/app/core/`)

| File | Link | Exports & Responsibilities |
| :--- | :--- | :--- |
| `config.py` | [`backend/app/core/config.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/core/config.py) | `settings`, `Settings`. Manages environment settings, Pune center (`18.5204`, `73.8567`), maps provider toggle (`osrm`, `mapbox`, `google`). |
| `database.py` | [`backend/app/core/database.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/core/database.py) | `Base`, `engine`, `async_session_factory`, `get_db()`, `init_db()`. Handles async SQLAlchemy sessions for SQLite / PostgreSQL with UTC timestamps. |
| `security.py` | [`backend/app/core/security.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/core/security.py) | `UserRole`, `get_password_hash()`, `verify_password()`, `create_access_token()`, `decode_access_token()`, `get_current_user()`, `require_role()`. |
| `__init__.py` | [`backend/app/core/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/core/__init__.py) | Core package re-exports. |

---

## 📁 Database Models (`backend/app/models/`)

| File | Link | Entity & Key Columns |
| :--- | :--- | :--- |
| `user.py` | [`backend/app/models/user.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/user.py) | `User`: `id`, `email`, `hashed_password`, `full_name`, `role`, `organization`, `badge_id`, `is_active`. |
| `hospital.py` | [`backend/app/models/hospital.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/hospital.py) | `Hospital`: `id`, `name`, `address`, `latitude`, `longitude`, `trauma_level`, `has_cath_lab`, `has_stroke_center`, `has_burn_unit`, `has_pediatric_icu`, `status`, `icu_total`, `icu_available`, `ed_beds_total`, `ed_beds_available`, `last_telemetry_update`. |
| `ambulance.py` | [`backend/app/models/ambulance.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/ambulance.py) | `Ambulance`: `id`, `callsign`, `capability` (`BLS`, `ALS`), `status`, `current_lat`, `current_lng`, `heading`, `speed_kmh`, `assigned_emergency_id`, `destination_lat`, `destination_lng`, `eta_minutes`. |
| `emergency.py` | [`backend/app/models/emergency.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/emergency.py) | `Emergency`: `id`, `tracking_code`, `status`, `human_confirmation_status`, `caller_name`, `caller_phone`, `address`, `latitude`, `longitude`, `chief_complaint`, `reported_symptoms_json`, `preliminary_urgency`.<br>`TimelineEvent`: Chronological incident events. |
| `audit.py` | [`backend/app/models/audit.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/audit.py) | `AuditLog`: Immutable audit trail (`agent_name`, `action`, `tool_used`, `input_payload`, `output_payload`, `reason`, `confidence`, `human_approval_status`, `timestamp`). |
| `__init__.py` | [`backend/app/models/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/models/__init__.py) | Models package re-exports. |

---

## 📁 Validation Schemas (`backend/app/schemas/`)

| File | Link | Key Schemas |
| :--- | :--- | :--- |
| `auth.py` | [`backend/app/schemas/auth.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/auth.py) | `UserCreate`, `UserResponse`, `TokenResponse`, `LoginRequest`. |
| `hospital.py` | [`backend/app/schemas/hospital.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/hospital.py) | `HospitalResponse`, `HospitalUpdateCapacity`, `HospitalBase`. |
| `ambulance.py` | [`backend/app/schemas/ambulance.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/ambulance.py) | `AmbulanceResponse`, `AmbulanceUpdateTelemetry`, `AmbulanceBase`. |
| `emergency.py` | [`backend/app/schemas/emergency.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/emergency.py) | `EmergencyCreate`, `EmergencyResponse`, `TimelineEventResponse`, `HumanConfirmationRequest`. |
| `audit.py` | [`backend/app/schemas/audit.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/audit.py) | `AuditLogCreate`, `AuditLogResponse`. |
| `__init__.py` | [`backend/app/schemas/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/schemas/__init__.py) | Schemas package re-exports. |

---

## 📁 Integration Adapters (`backend/app/adapters/`)

| File | Link | Key Interfaces & Implementations |
| :--- | :--- | :--- |
| `base.py` | [`backend/app/adapters/base.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/adapters/base.py) | Abstract Base Classes: `MapsAdapter`, `HospitalAdapter`, `FleetAdapter`, `RouteResult`, `GeocodeResult`. |
| `maps_adapter.py` | [`backend/app/adapters/maps_adapter.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/adapters/maps_adapter.py) | `OSRMAndNominatimMapsAdapter`, `MapboxMapsAdapter`, `haversine_distance()`, `get_maps_adapter()`. Live road routing and real geocoding. |
| `hospital_adapter.py` | [`backend/app/adapters/hospital_adapter.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/adapters/hospital_adapter.py) | `DatabaseSimulatedHospitalAdapter`, `hospital_to_dict()`, `get_hospital_adapter()`. Staleness metrics and capacity mutation. |
| `fleet_adapter.py` | [`backend/app/adapters/fleet_adapter.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/adapters/fleet_adapter.py) | `DatabaseSimulatedFleetAdapter`, `ambulance_to_dict()`, `get_fleet_adapter()`. Vehicle telematics and dispatch. |
| `__init__.py` | [`backend/app/adapters/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/adapters/__init__.py) | Adapters package re-exports. |

---

## 📁 Simulation & Pune Seeds (`backend/app/simulation/`)

| File | Link | Purpose & Contents |
| :--- | :--- | :--- |
| `seed_data.py` | [`backend/app/simulation/seed_data.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/simulation/seed_data.py) | 14 real Pune hospitals (Sassoon, Ruby Hall, Jehangir, Deenanath, KEM, Sahyadri, etc.) and 12 ambulances (8 BLS, 4 ALS) plus 5 demo users. |
| `engine.py` | [`backend/app/simulation/engine.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/simulation/engine.py) | `SimulationEngine`: Background 3.0s tick loop for bed updates, vehicle movement, and scenario injections (`inject_capacity_drop`, `inject_traffic_delay`). |
| `__init__.py` | [`backend/app/simulation/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/simulation/__init__.py) | Simulation package re-exports. |

---

## 📁 API Endpoints (`backend/app/api/v1/`)

| File | Link | Routes & Endpoints |
| :--- | :--- | :--- |
| `auth.py` | [`backend/app/api/v1/auth.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/auth.py) | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me`<br>`GET /api/v1/auth/demo-tokens` |
| `hospitals.py` | [`backend/app/api/v1/hospitals.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/hospitals.py) | `GET /api/v1/hospitals`<br>`GET /api/v1/hospitals/{id}`<br>`PATCH /api/v1/hospitals/{id}/capacity` |
| `ambulances.py` | [`backend/app/api/v1/ambulances.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/ambulances.py) | `GET /api/v1/ambulances`<br>`GET /api/v1/ambulances/{id}`<br>`PATCH /api/v1/ambulances/{id}/telemetry` |
| `emergencies.py` | [`backend/app/api/v1/emergencies.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/emergencies.py) | `POST /api/v1/emergencies` (Intake + Geocoding + Timeline + Audit)<br>`GET /api/v1/emergencies`<br>`GET /api/v1/emergencies/{id}`<br>`POST /api/v1/emergencies/{id}/confirm` (Human gate) |
| `audit_logs.py` | [`backend/app/api/v1/audit_logs.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/audit_logs.py) | `GET /api/v1/audit-logs` (Immutable chronological audit log). |
| `maps.py` | [`backend/app/api/v1/maps.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/maps.py) | `GET /api/v1/maps/route` (OSRM driving route & polyline coordinates)<br>`GET /api/v1/maps/reverse-geocode` (Nominatim reverse geocode). |
| `response_teams.py` | [`backend/app/api/v1/response_teams.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/response_teams.py) | `GET /api/v1/response-teams` (Specialized first responder units). |
| `simulation.py` | [`backend/app/api/v1/simulation.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/simulation.py) | `POST /api/v1/simulation/inject/capacity-drop`<br>`POST /api/v1/simulation/inject/traffic-delay`<br>`GET /api/v1/simulation/status`<br>`POST /api/v1/simulation/start`<br>`POST /api/v1/simulation/stop` |
| `ws.py` | [`backend/app/api/v1/ws.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/ws.py) | `WebSocket /ws`<br>`ConnectionManager`, `ws_manager.broadcast()`. |
| `__init__.py` | [`backend/app/api/v1/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/api/v1/__init__.py) | Bundles all v1 routers into `api_v1_router` and `api_direct_router`. |

---

## 📁 User Interface & Command Center Architecture (`backend/app/static/`)

| File | Link | Description |
| :--- | :--- | :--- |
| `index.html` | [`backend/app/static/index.html`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/index.html) | Mission-critical dark command center console with 13 unified navigation sections, hero GIS map HUD, modals, and toast alerts. |
| `css/command_center.css` | [`backend/app/static/css/command_center.css`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/css/command_center.css) | Deep obsidian slate tokens, radar pulse animations, custom marker styles, and responsive grids. |
| `js/api.js` | [`backend/app/static/js/api.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/api.js) | Unified client API service for all backend endpoints with fallback handling. |
| `js/websocket.js` | [`backend/app/static/js/websocket.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/websocket.js) | Resilient WebSocket stream manager with auto-reconnect and heartbeat ping/pong. |
| `js/map_engine.js` | [`backend/app/static/js/map_engine.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/map_engine.js) | Leaflet GIS live operations map, custom SVG pulse markers, draggable ambulance relocation, road polyline drawing, and area intelligence. |
| `js/heatmap_engine.js` | [`backend/app/static/js/heatmap_engine.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/heatmap_engine.js) | Incident spatial concentration heatmap with timeframe and category filters. |
| `js/dispatch_console.js` | [`backend/app/static/js/dispatch_console.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/dispatch_console.js) | Step-by-step dispatcher workflow console (Emergency → Ambulance → Hospital → Dispatch route). |
| `js/ai_assistant.js` | [`backend/app/static/js/ai_assistant.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/ai_assistant.js) | Operational coordination assistant evaluating GIS proximity and clinical capacity, with explainability. |
| `js/analytics_engine.js` | [`backend/app/static/js/analytics_engine.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/analytics_engine.js) | Chart.js visualizer for fleet utilization, hospital capacity, and triage distribution. |
| `js/app.js` | [`backend/app/static/js/app.js`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/app/static/js/app.js) | Central controller managing 13 section routing, modal dialogs, audio alerts, and simulation triggers. |

---

## 📁 Automated Pytest Suite (`backend/tests/`)

| File | Link | Coverage |
| :--- | :--- | :--- |
| `test_foundation.py` | [`backend/tests/test_foundation.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/tests/test_foundation.py) | Bcrypt hashing, JWT token lifecycle, and Pune database seeding (14 hospitals, 12 ambulances: 8 BLS, 4 ALS). |
| `test_adapters.py` | [`backend/tests/test_adapters.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/tests/test_adapters.py) | Live OpenStreetMap geocoding for Pune, OSRM real road navigation, Ruby Hall capacity updates, and 108 ambulance updates. |
| `test_emergency_flow.py` | [`backend/tests/test_emergency_flow.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/tests/test_emergency_flow.py) | End-to-end emergency intake, audit log creation, human confirmation gate (`APPROVED`), and Section 10 ICU capacity drop injection. |
| `test_new_features.py` | [`backend/tests/test_new_features.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/tests/test_new_features.py) | Tests for new endpoints: Audit Logs, Response Teams, OSRM road routing, Reverse Geocoding, and Ambulance Dispatching. |
| `__init__.py` | [`backend/tests/__init__.py`](file:///C:/Users/PARTH/.gemini/antigravity/scratch/lifelink/backend/tests/__init__.py) | Tests package marker. |
