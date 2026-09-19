# LIFELINK — Multi-Agent Engineering & Operations Guide (`AGENTS.md`)
*Localized for Pune Metropolitan Area, Maharashtra, India*

## 1. Non-Negotiable System Hard Constraints
1. **Zero Autonomous Medical Diagnosis**: LIFELINK is an agentic emergency response and coordination platform, NOT an AI doctor. Agents never diagnose illnesses, prescribe medication, or formulate clinical treatment plans. Agents categorize protocol-based urgency (e.g. Manchester Triage / ESI protocols) and calculate clinical resource needs (e.g., Cath Lab, Level 1 Trauma, Burn Unit, ICU/PICU).
2. **Human-in-the-Loop State Machine**: Every consequential recommendation must follow:
   `RECOMMENDED` → `WAITING FOR HUMAN CONFIRMATION` → `APPROVED` / `REJECTED`
   No destination change or high-urgency escalation is finalized without authorized human confirmation.
3. **Strict Architecture Layering**:
   ```
   UI → API → Orchestrator → Agents → Tools → External Integration Adapters → Database
   ```
   - **Agents NEVER touch the database or any external system directly.**
   - Agents operate exclusively through explicit, typed **Tools**.
   - Tools communicate with **External Integration Adapters** (`HospitalAdapter`, `FleetAdapter`, `MapsAdapter`).
   - The **Master Orchestrator** owns state transitions, agent invocation sequencing, conflict resolution, and escalation.
   - The **API layer** exposes REST and WebSocket interfaces to the UI without containing agent business logic.
4. **Agent Explainability & Audit Log**:
   Every agent recommendation must provide transparent reasoning (`why this decision was made`), input parameters, confidence assessment, and must write to the immutable `AuditLog` table.
5. **No Real Patient Data**:
   All patient information, medical complaints, and scenarios are strictly synthetic and de-identified.
6. **Visual Distinction in UI**:
   The UI must clearly distinguish between:
   - **Reported Information** (from caller/bystander)
   - **System-Generated Recommendations** (AI recommended, awaiting confirmation - styled in distinct muted purple/gray-blue chip)
   - **Clinician-Confirmed Information** (approved by human - styled in clinical blue/green chip)

---

## 2. Indian EMS Reality & Pune Localization Standards
- **Ambulance Model (Section 19)**:
  - **BLS (Basic Life Support)**: Crewed by an Ambulance Pilot (driver) and an Emergency Medical Technician (EMT). Standard in Maharashtra's 108 EMRI service. Represents the majority (>80%) of Pune's fleet.
  - **ALS (Advanced Life Support)**: Scarce units equipped with doctor/paramedic, transport ventilator, and emergency cardiac drugs.
  - **Operational Rule**: If no ALS unit is within acceptable response time, the system will assign the nearest BLS unit and explicitly weight the Hospital Matching Agent toward facilities with immediate on-site critical care / Cath Lab teams.
- **Timezone Standard**: All timestamps across the database, telemetry, logs, and APIs **MUST be generated and stored in UTC** (`datetime.now(timezone.utc)`). All UI presentation converts and renders in **IST (Asia/Kolkata, UTC+5:30)**.
- **Emergency Call Fallbacks (Always Visible)**:
  - **112**: India's Unified National Emergency Helpline
  - **108**: Maharashtra Free Emergency Ambulance (EMRI)
  - **102**: Free Maternal / Infant Transport Ambulance
  - **100 / 101**: Police / Fire
- **Geography & Addresses**: Real addresses across Pune (PMC) and Pimpri-Chinchwad (PCMC) with 6-digit PIN codes (e.g. 411001, 411004, 411057). Real geocoding and road routing via `MapsAdapter` (OSRM / OpenStreetMap / Mapbox).
- **Phone Number Standard**: Indian 10-digit mobile format (`+91 9XXXX XXXXX`).
- **Currency**: Indian Rupee (`INR` / `₹`).
- **Multilingual Support**: English (default), मराठी (Marathi), हिन्दी (Hindi).

---

## 3. Running the Application & Tests
- **Bootstrap & Run Server**:
  ```bash
  python run.py
  ```
  Launches the FastAPI backend and real-time WebSocket server at `http://localhost:8000`.
- **Run Unit & Integration Tests**:
  ```bash
  python -m pytest backend/tests -v
  ```
- **Run Digital Twin Simulator**:
  The simulation engine runs as a background task inside FastAPI, continuously updating Pune hospital bed capacities and ambulance GPS locations. Control it via the `/api/v1/simulation` endpoints.
