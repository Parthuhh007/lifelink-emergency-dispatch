# LIFELINK — Engineering & Operations Guide (`AGENTS.md`)

**Project:** Lifelink — Geospatial Emergency Dispatch System
**Primary Region:** Pune Metropolitan Area, Maharashtra, India

This document provides engineering instructions and operational conventions for contributors and AI coding agents working on the Lifelink repository.

The goal is to keep the codebase modular, predictable, secure, and consistent with the current implementation.

---

# 1. Project Overview

Lifelink is a geospatial emergency dispatch and coordination platform.

The system connects:

```text
Users
   ↓
Emergency Requests
   ↓
API Gateway
   ↓
Emergency / Response Services
   ↓
Verified Emergency Providers
   ↓
Navigation & Dispatch
```

The application supports emergency request creation, provider registration, provider verification, geospatial location handling, dispatch workflows, live operational dashboards, and navigation.

Lifelink is a **software coordination platform** and does not replace official emergency services, trained dispatchers, medical professionals, police, fire departments, or government emergency infrastructure.

---

# 2. Non-Negotiable Engineering Constraints

## 2.1 No Autonomous Medical Decision-Making

Lifelink must not be represented as an autonomous medical diagnosis or treatment system.

The application must not:

* Diagnose medical conditions.
* Prescribe medication.
* Recommend clinical treatment.
* Replace medical professionals.
* Automatically make clinical decisions on behalf of emergency personnel.

Emergency information may be collected and coordinated as part of the dispatch workflow, but clinical decisions remain outside the scope of the platform.

---

## 2.2 Human-Controlled Dispatch Workflow

Emergency dispatch actions must remain explicit and traceable.

The expected operational flow is:

```text
Emergency Created
        ↓
Searching
        ↓
Provider Identified
        ↓
Provider Accepts
        ↓
Dispatched
        ↓
Arrived
        ↓
Completed
```

A provider should not be silently assigned without the appropriate application workflow.

Changes to emergency assignment or provider state must be handled by backend services rather than being implemented only in the frontend.

---

## 2.3 Service Boundaries

The current architecture is service-oriented:

```text
                    ┌─────────────────┐
                    │     Frontend    │
                    │  React + Leaflet│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   API Gateway   │
                    │      :8000      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
 ┌────────────┐       ┌────────────┐       ┌────────────┐
 │    Auth    │       │    User    │       │  Emergency │
 │   :3001    │       │   :3002    │       │   :3003    │
 └────────────┘       └────────────┘       └─────┬──────┘
                                                   │
                                                   ▼
                                            ┌────────────┐
                                            │  Response  │
                                            │   :3004    │
                                            └────────────┘

                         ┌────────────┐
                         │   Admin    │
                         │   :3005    │
                         └────────────┘

                              │
                              ▼
                         ┌────────────┐
                         │  MongoDB   │
                         └────────────┘
```

### Service Responsibilities

| Service           | Responsibility                               |
| ----------------- | -------------------------------------------- |
| API Gateway       | Central API entry point                      |
| Auth Service      | Authentication and provider verification     |
| User Service      | User-related operations                      |
| Emergency Service | Emergency creation and lifecycle             |
| Response Service  | Provider availability and dispatch           |
| Admin Service     | Administrative monitoring and verification   |
| Frontend          | User, provider, and administrator interfaces |
| MongoDB           | Persistent application data                  |

Do not move business logic between services without a clear architectural reason.

---

# 3. Current Technology Stack

## Frontend

* React
* JavaScript / JSX
* Leaflet
* Browser Geolocation API
* Tailwind-based UI components

## Backend

* Node.js
* Express.js
* REST APIs
* WebSockets
* JWT
* bcrypt

## Database

* MongoDB
* Mongoose

## Infrastructure

* Docker
* Docker Compose
* Git
* GitHub

---

# 4. Running the Application

The current project is **not based on the previous FastAPI/Python architecture**.

Do not introduce or restore:

```text
python run.py
FastAPI
backend/tests
Python virtual environments
Python-only service architecture
```

unless the architecture is intentionally redesigned and documented.

The preferred multi-service development environment uses Docker Compose.

Start the project:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up --build -d
```

Stop the application:

```bash
docker compose down
```

Individual Node services may be run locally when debugging.

---

# 5. Service Ports

The current service layout uses:

```text
API Gateway       :8000
Auth Service      :3001
User Service      :3002
Emergency Service :3003
Response Service  :3004
Admin Service     :3005
```

Do not hard-code `localhost` for service-to-service communication inside Docker.

Use Docker Compose service names and environment variables.

For example:

```text
auth-service
user-service
emergency-service
response-service
admin-service
```

rather than assuming:

```text
localhost:3001
localhost:3002
localhost:3003
```

from inside containers.

---

# 6. Frontend Rules

The frontend is located under:

```text
frontend/
```

The frontend communicates with backend services through the configured API layer.

When modifying React code:

* Preserve existing application workflows.
* Avoid unnecessary UI redesign.
* Keep components maintainable.
* Avoid duplicated API requests.
* Handle loading and error states.
* Validate user input.
* Do not put security-sensitive logic exclusively in the frontend.

## Important

Do not make visual redesigns when the requested change is purely functional.

Existing dashboard layouts, navigation, map interfaces, and status indicators should remain stable unless a UI change is explicitly required.

---

# 7. Emergency Workflow

Emergency creation should follow the existing backend workflow.

Conceptually:

```text
User
 ↓
Create Emergency
 ↓
Emergency Service
 ↓
Emergency Stored
 ↓
Response Service
 ↓
Available Provider Search
 ↓
Provider Alert
 ↓
Provider Accepts
 ↓
Emergency Assigned
 ↓
Provider Dispatched
 ↓
Provider Arrives
 ↓
Emergency Completed
```

The backend is responsible for authoritative state changes.

The frontend must not independently claim that an emergency has been dispatched without confirmation from the backend.

---

# 8. Emergency States

Emergency states should remain explicit.

Typical states include:

```text
SEARCHING
ASSIGNED
DISPATCHED
ARRIVED
COMPLETED
```

When modifying state transitions:

1. Validate the current state.
2. Validate the requested transition.
3. Update the backend state.
4. Update the assigned provider where applicable.
5. Notify dependent clients if required.
6. Prevent duplicate transitions.

Avoid introducing undocumented state names.

---

# 9. Provider States

Provider availability should remain explicit.

Typical availability states include:

```text
AVAILABLE
BUSY
DISPATCHED
ARRIVED
OFFLINE
```

Provider verification states include:

```text
PENDING
APPROVED
REJECTED
```

Do not mix verification state with availability state.

For example:

```text
verificationStatus = APPROVED
availability = AVAILABLE
```

represents a verified provider that is currently available.

---

# 10. Provider Verification

Provider registration currently collects information such as:

```text
Provider Name
Vehicle Registration Number
License ID
Phone Number
```

The current verification rule for the emergency-provider workflow requires the License ID to end with:

```text
.service
```

or:

```text
.services
```

The validation is case-insensitive and ignores surrounding whitespace.

Conceptually:

```javascript
/\.services?$/i
```

A valid provider should be processed as an approved provider.

An invalid provider should be rejected.

The application should not create duplicate ambulance/provider records when the same provider registration is processed repeatedly.

---

# 11. Geospatial Rules

Geospatial functionality is a core part of Lifelink.

Location information is represented using:

```text
latitude
longitude
```

## Coordinate Order

Always preserve the application's established coordinate convention.

When constructing map or navigation URLs, ensure latitude and longitude are not accidentally reversed.

Example:

```text
destination=LATITUDE,LONGITUDE
```

---

# 12. User Geolocation

When the user grants browser location permission, the frontend may obtain:

```text
latitude
longitude
```

The location should flow through the application consistently:

```text
Browser GPS
    ↓
User Dashboard
    ↓
Emergency Payload
    ↓
Emergency Service
    ↓
Response / Dispatch
    ↓
Provider Map
    ↓
Navigation
```

Do not replace user-provided coordinates with arbitrary hard-coded coordinates unless a test/demo scenario explicitly requires it.

---

# 13. Maps and Navigation

Lifelink uses Leaflet for interactive map visualization.

External mapping/routing providers may be used through the application's map integration layer.

Navigation to an emergency location may use a Google Maps deep link:

```text
https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
```

When modifying navigation:

* Validate coordinates.
* Encode URL parameters correctly.
* Open external navigation links safely.
* Do not expose private application data unnecessarily.

---

# 14. Interactive Map

The map is an operational component of the application.

It may display:

* Emergency locations
* User locations
* Ambulance/provider locations
* Operational markers
* Relevant geographic information

Map functionality should remain responsive and should not block the primary emergency workflow.

When adding markers, ensure the marker data corresponds to authoritative backend data where applicable.

---

# 15. Real-Time Communication

Lifelink supports real-time communication through WebSockets and/or controlled polling depending on the workflow.

When working with WebSockets:

* Validate incoming events.
* Prevent duplicate event processing.
* Handle disconnections.
* Handle reconnections appropriately.
* Avoid leaking sensitive information.
* Keep event names consistent.

An example operational event is:

```text
new_emergency
```

Do not introduce a new event name when an existing event already represents the required operation.

---

# 16. Emergency Alerts

Service-provider dashboards may receive emergency alerts through real-time communication or polling.

The alert system should:

* Avoid duplicate notifications.
* Avoid repeated audio playback for the same emergency.
* Clearly identify the emergency.
* Display relevant location information.
* Allow the provider to take the appropriate workflow action.

Alert functionality should not interfere with existing dashboard navigation.

---

# 17. Dispatch Concurrency

Dispatch operations are sensitive to race conditions.

Multiple providers may potentially attempt to accept the same emergency.

Backend logic must therefore ensure that an emergency cannot accidentally become assigned to multiple providers.

When modifying dispatch code:

* Perform authoritative checks on the server.
* Verify emergency state before assignment.
* Verify provider availability.
* Perform updates safely.
* Re-check state where necessary.
* Return an appropriate conflict/error response when another provider has already claimed the emergency.

Frontend checks alone are not sufficient.

---

# 18. Authentication

Authentication is handled through the Auth Service.

The application uses JWT-based authentication.

Passwords must be stored using secure password hashing such as bcrypt.

Never:

* Store plaintext passwords.
* Commit JWT secrets.
* Commit passwords.
* Log authentication tokens.
* Expose private credentials in frontend code.

Authorization must be enforced on the backend.

---

# 19. Administrative Dashboard

The Admin Dashboard is intended for operational monitoring and provider verification visibility.

Administrative functionality should clearly distinguish:

```text
Provider
Verification Status
Availability
Dispatch State
```

The dashboard should not expose unnecessary sensitive information.

If a feature is intended to be read-only monitoring, do not add destructive administrative actions without explicit requirements.

---

# 20. Database Rules

Lifelink uses MongoDB.

When modifying Mongoose models:

* Preserve existing field semantics.
* Avoid unnecessary schema duplication.
* Validate important fields.
* Consider indexes for frequently queried fields.
* Avoid destructive migrations without a clear plan.
* Keep data ownership aligned with service responsibilities.

Do not directly manipulate another service's internal database model from the frontend.

---

# 21. Environment Variables and Secrets

Never commit real secrets.

Sensitive files generally include:

```text
.env
.env.local
.env.production
```

Use:

```text
.env.example
```

to document required configuration.

Potential environment variables include:

```text
MONGO_URI
JWT_SECRET
PORT
API_URL
MAP_API_KEY
```

Actual values must remain local or be supplied through a secure deployment environment.

---

# 22. Time and Dates

Where timestamps are persisted or exchanged between backend services, use a consistent machine-readable representation.

Prefer UTC for backend storage and service-to-service communication.

Frontend displays may convert timestamps to the user's local timezone where appropriate.

Do not introduce inconsistent timestamp formats across services.

---

# 23. Pune Localization

The application is designed around the Pune Metropolitan Area.

Demo data may use locations such as:

```text
Pune
Pimpri-Chinchwad
Hinjawadi
Viman Nagar
Magarpatta
Swargate
Aundh
FC Road
```

When creating demonstration data:

* Use plausible geographic coordinates.
* Use realistic Indian address formats.
* Use six-digit Indian PIN codes.
* Use Indian phone-number formatting.
* Use INR when monetary values are required.

The application should support:

```text
English
मराठी
हिन्दी
```

English remains the default unless the UI explicitly specifies another language.

---

# 24. Emergency Helplines

Where emergency contact information is displayed, the project may reference:

```text
112 — Unified Emergency Helpline
108 — Emergency Ambulance
102 — Maternal / Infant Transport
100 — Police
101 — Fire
```

These numbers must not be presented as a replacement for the application's own operational workflow.

When changing emergency-contact information, verify the information before modifying the UI.

---

# 25. Code Quality

Prefer:

* Small functions
* Clear variable names
* Explicit error handling
* Reusable components
* Consistent API structures
* Minimal duplication
* Simple control flow

Avoid:

* Unnecessary abstractions
* Large monolithic functions
* Hard-coded credentials
* Dead code
* Debugging statements left in production paths
* Unrelated refactoring during feature work

---

# 26. Testing Requirements

Before considering a change complete, test the affected workflow.

For backend changes, verify:

```text
Service starts
API responds
Validation works
Error cases work
Database operations work
Authentication remains functional
```

For frontend changes, verify:

```text
Page loads
API requests work
Loading states work
Error states work
Map functionality works where applicable
No unexpected console errors appear
```

For dispatch changes, test at minimum:

```text
Emergency created
Provider receives emergency
Provider accepts
Emergency becomes assigned
Provider becomes unavailable/busy
Navigation works
Provider arrival updates correctly
Emergency completion restores provider availability
```

---

# 27. Test Files

Tests should be kept close to the relevant service or in the repository's established testing structure.

Do not introduce the previous Python testing command:

```text
python -m pytest backend/tests -v
```

The current project uses JavaScript/Node-based services.

Use the relevant service's configured npm test command when available.

Example:

```bash
npm test
```

or the specific test script defined in that service's `package.json`.

---

# 28. Dependency Management

Before adding a dependency:

1. Check whether the functionality already exists.
2. Check whether the dependency is actively maintained.
3. Consider security implications.
4. Consider bundle/runtime impact.
5. Keep the dependency scoped to the service that actually needs it.

After installation, commit the relevant:

```text
package.json
package-lock.json
```

Do not commit:

```text
node_modules/
```

---

# 29. Repository Hygiene

The repository should not contain generated or machine-specific files.

The `.gitignore` should exclude items such as:

```text
node_modules/
dist/
.vite/
__pycache__/
*.pyc
.pytest_cache/
.env
.env.*
*.log
.DS_Store
Thumbs.db
```

Do not commit:

* API keys
* Passwords
* JWT secrets
* Database credentials
* Personal tokens
* Large generated build directories
* Local machine configuration

Before committing:

```bash
git status
```

Review the complete change list.

---

# 30. Git Workflow

Create a focused branch:

```bash
git checkout -b feature/feature-name
```

Examples:

```text
feature/geospatial-dispatch
feature/provider-verification
feature/emergency-alerts
feature/map-improvements
fix/dispatch-race-condition
fix/provider-registration
docs/update-architecture
```

Keep changes focused and reviewable.

---

# 31. Commit Convention

Use descriptive commit messages.

Recommended prefixes:

```text
feat:
fix:
docs:
test:
refactor:
perf:
chore:
style:
```

Examples:

```text
feat: add provider geolocation
fix: prevent duplicate emergency assignment
docs: update architecture guide
test: add license validation tests
refactor: simplify response service
chore: update dependencies
```

Avoid vague commits such as:

```text
update
changes
final
fixed
stuff
```

---

# 32. Pull Request Requirements

A Pull Request should explain:

### What changed?

Describe the implementation.

### Why was it changed?

Explain the problem or requirement.

### How was it tested?

Describe the tests or manual verification performed.

### UI Changes

Include screenshots or a short demonstration when relevant.

Before submitting:

```text
[ ] Code builds successfully
[ ] Relevant services start
[ ] Tests pass
[ ] No secrets are committed
[ ] No node_modules are committed
[ ] No unnecessary generated files are included
[ ] Documentation is updated
[ ] Git diff has been reviewed
```

---

# 33. Documentation Requirements

Update documentation when introducing:

* New services
* New APIs
* New environment variables
* New database fields
* New workflows
* New external integrations
* Major architectural changes

Important project documentation includes:

```text
README.md
CONTRIBUTING.md
AGENTS.md
LICENSE
.env.example
```

Documentation should describe the **actual current implementation**, not an intended or deprecated architecture.

---

# 34. AI Coding Agent Rules

AI coding agents working in this repository must:

1. Inspect the existing implementation before changing architecture.
2. Prefer minimal targeted changes.
3. Avoid rewriting working components unnecessarily.
4. Preserve existing APIs unless a breaking change is explicitly requested.
5. Never fabricate external services, credentials, API keys, or database records.
6. Never commit secrets.
7. Never silently remove existing functionality.
8. Never introduce a second architecture without explicit approval.
9. Test affected functionality after modifications.
10. Update documentation when architectural behavior changes.

### Important

Do not assume that an old documentation file represents the current codebase.

The implementation is the source of truth.

If documentation conflicts with the current implementation, inspect the code before making architectural changes.

---

# 35. External Services

External integrations may include:

* Mapping providers
* Routing providers
* Google Maps navigation
* Map tile providers

External API keys must be configured through environment variables.

Never hard-code private API keys in:

```text
React source
Backend source
README.md
AGENTS.md
CONTRIBUTING.md
```

Public client-side configuration should still be reviewed carefully before being committed.

---

# 36. Error Handling

Errors should be explicit and useful.

Backend responses should provide an appropriate HTTP status and a safe message.

Avoid exposing:

* Stack traces to end users
* Database credentials
* JWT secrets
* Internal tokens
* Sensitive infrastructure details

Log enough information for debugging while avoiding sensitive data.

---

# 37. Performance

Avoid unnecessary:

* Database queries
* API polling
* WebSocket connections
* React re-renders
* Map marker recreation
* Large frontend payloads

When implementing polling, use a controlled interval and clean it up when the relevant component is unmounted or the workflow becomes inactive.

---

# 38. Security Checklist

Before merging security-sensitive changes, verify:

```text
[ ] Authentication is enforced where required
[ ] Authorization is enforced server-side
[ ] Passwords are hashed
[ ] Secrets are not committed
[ ] User input is validated
[ ] API responses do not expose sensitive data
[ ] External URLs are handled safely
[ ] Database queries are validated
[ ] Logs do not expose credentials or tokens
```

---

# 39. Operational Philosophy

Lifelink should be engineered around:

### Reliability

Emergency workflows should fail predictably rather than silently.

### Modularity

Each service should have a clear responsibility.

### Security

Sensitive information must be protected throughout the system.

### Transparency

System state should be understandable from the user and provider interfaces.

### Maintainability

Prefer readable and understandable implementations.

### Minimal Complexity

Do not introduce distributed-system complexity unless it provides a concrete benefit.

---

# 40. Scope and Safety

Lifelink is a software engineering and emergency coordination project.

It is intended for:

* Development
* Demonstration
* Research
* Prototyping
* Academic projects
* Software architecture experimentation

It should not be represented as certified emergency infrastructure or as a substitute for official emergency-response systems.

Any deployment involving real emergency operations would require appropriate regulatory, security, reliability, privacy, operational, and legal review.

---

# 41. Final Rule

When working on Lifelink:

> **Preserve working functionality, respect service boundaries, protect sensitive information, make targeted changes, and verify the result before committing.**

The current implementation is the source of truth.

When in doubt:

```text
Inspect
  ↓
Understand
  ↓
Modify minimally
  ↓
Test
  ↓
Review diff
  ↓
Document
```

---

# 42. License



See the [`LICENSE`](LICENSE) file for the complete license text.
