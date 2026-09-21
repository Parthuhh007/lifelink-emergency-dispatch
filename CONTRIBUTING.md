# Contributing to Lifelink

Thank you for your interest in contributing to **Lifelink — Geospatial Emergency Dispatch System**.

Lifelink is a modular emergency-response platform designed to demonstrate how software systems can coordinate emergency requests, service providers, geospatial information, dispatch workflows, and real-time operational updates.

Contributions are welcome in areas such as backend services, frontend development, APIs, geospatial functionality, testing, documentation, security, and developer experience.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Technology Stack](#technology-stack)
* [Repository Structure](#repository-structure)
* [Development Prerequisites](#development-prerequisites)
* [Getting Started](#getting-started)
* [Running the Project](#running-the-project)
* [Development Guidelines](#development-guidelines)
* [Backend Development](#backend-development)
* [Frontend Development](#frontend-development)
* [API Guidelines](#api-guidelines)
* [Database Guidelines](#database-guidelines)
* [Geospatial Guidelines](#geospatial-guidelines)
* [Real-Time Communication](#real-time-communication)
* [Authentication and Security](#authentication-and-security)
* [Testing](#testing)
* [Git Workflow](#git-workflow)
* [Commit Guidelines](#commit-guidelines)
* [Pull Requests](#pull-requests)
* [Code Review](#code-review)
* [Documentation](#documentation)
* [Environment Variables](#environment-variables)
* [Issues and Bug Reports](#issues-and-bug-reports)
* [Design Principles](#design-principles)
* [License](#license)

---

## Project Overview

Lifelink follows a service-oriented architecture consisting of independent backend services connected through an API Gateway.

The primary components are:

* **Frontend** — React-based user, service-provider, and administrator interfaces
* **API Gateway** — Central entry point for frontend API requests
* **Auth Service** — Authentication, authorization, and provider verification logic
* **User Service** — User-related operations
* **Emergency Service** — Emergency creation and lifecycle management
* **Response Service** — Emergency-provider matching and dispatch operations
* **Admin Service** — Administrative monitoring and verification workflows
* **MongoDB** — Persistent application data
* **Docker Compose** — Local multi-service orchestration

The system also uses:

* JWT-based authentication
* bcrypt password hashing
* WebSocket-based communication where applicable
* Leaflet-based geospatial visualization
* Browser geolocation
* Google Maps navigation links
* REST APIs between application components

---

# Technology Stack

### Frontend

* React
* JavaScript / JSX
* Leaflet
* Browser Geolocation API
* CSS / Tailwind-based UI components

### Backend

* Node.js
* Express.js
* REST APIs
* WebSockets
* JWT
* bcrypt

### Database

* MongoDB
* Mongoose

### Infrastructure

* Docker
* Docker Compose
* Git
* GitHub

---

# Repository Structure

The repository is organized approximately as follows:

```text
lifelink-emergency-dispatch/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── emergency-service/
│   ├── response-service/
│   └── admin-service/
│
├── gateway/
│   └── ...
│
├── docker-compose.yml
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── .gitignore
└── ...
```

Individual services should remain modular and should avoid unnecessary coupling to unrelated services.

---

# Development Prerequisites

Before contributing, install the required development tools.

Recommended:

* Git
* Node.js
* npm
* Docker Desktop
* MongoDB, if running the database outside Docker
* A modern browser
* VS Code or another JavaScript-compatible IDE

Verify your installations:

```bash
node --version
npm --version
git --version
docker --version
```

---

# Getting Started

Clone the repository:

```bash
git clone https://github.com/Parthuhh007/lifelink-emergency-dispatch.git
```

Enter the project directory:

```bash
cd lifelink-emergency-dispatch
```

Install dependencies for the relevant application or service.

For example:

```bash
cd frontend
npm install
```

For backend services:

```bash
cd services/auth-service
npm install
```

Repeat this for any service that you are actively developing.

Do **not** commit generated dependency directories such as:

```text
node_modules/
```

---

# Running the Project

The preferred development environment uses Docker Compose when the complete multi-service system is required.

Start the application stack with:

```bash
docker compose up --build
```

To run in detached mode:

```bash
docker compose up --build -d
```

To stop the stack:

```bash
docker compose down
```

Individual services may also be run locally when debugging specific components.

Always check the service configuration and environment variables before starting individual services.

---

# Development Guidelines

## Keep Services Modular

Each backend service should have a clearly defined responsibility.

For example:

* Auth Service → authentication and verification
* User Service → user operations
* Emergency Service → emergency lifecycle
* Response Service → dispatch and provider operations
* Admin Service → administrative monitoring

Avoid placing unrelated business logic inside a service simply because it is convenient.

---

## Prefer Small, Focused Changes

Contributions should solve a specific problem whenever possible.

Prefer:

```text
Fix provider verification
```

over combining unrelated changes such as:

```text
Fix provider verification
+ redesign dashboard
+ change database structure
+ update navigation
```

This makes reviews easier and reduces the possibility of regressions.

---

# Backend Development

Backend services use Node.js and Express.

When adding a new endpoint:

1. Define the route.
2. Validate incoming data.
3. Execute the required business logic.
4. Handle errors explicitly.
5. Return an appropriate HTTP status.
6. Keep database operations isolated and understandable.
7. Document significant API changes.

Example:

```javascript
router.post("/example", async (req, res) => {
    try {
        // Validate request
        // Execute operation
        // Return response
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
});
```

Avoid silently swallowing errors.

---

# Frontend Development

The frontend is built using React.

When modifying the UI:

* Prefer reusable components.
* Keep state management understandable.
* Avoid unnecessary global state.
* Handle loading and error states.
* Avoid unnecessary API requests.
* Keep user-facing messages clear.
* Preserve existing application workflows unless the change specifically requires modifying them.

### UI Stability

Lifelink contains operational dashboards where clarity is important.

Avoid changing existing:

* Layouts
* Navigation structures
* Color systems
* Dashboard workflows
* Emergency status indicators

unless the contribution specifically addresses a UI/UX requirement.

Functional improvements should generally be implemented without unnecessarily redesigning existing interfaces.

---

# API Guidelines

API endpoints should follow predictable REST conventions.

Use appropriate HTTP methods:

```text
GET     → Retrieve data
POST    → Create data
PUT     → Replace/update data
PATCH   → Partially update data
DELETE  → Remove data
```

Use meaningful status codes.

Examples:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

Responses should use consistent JSON structures.

Example:

```json
{
  "message": "Emergency created successfully",
  "emergencyId": "..."
}
```

Avoid exposing internal implementation details or sensitive information in API responses.

---

# Database Guidelines

Lifelink uses MongoDB for persistent application data.

When modifying schemas:

* Keep field names consistent.
* Use appropriate data types.
* Avoid unnecessary duplication.
* Consider indexing frequently queried fields.
* Validate important fields.
* Consider backward compatibility when changing existing schemas.

Database credentials must never be committed to Git.

---

# Geospatial Guidelines

Geospatial functionality is an important part of Lifelink.

Location data may include:

```text
latitude
longitude
```

When working with geospatial information:

* Validate coordinates.
* Use correct latitude/longitude ordering.
* Avoid hard-coded production locations.
* Keep location calculations consistent across services.
* Do not expose sensitive location information unnecessarily.

The application may use geospatial queries to identify nearby emergency-response providers.

For example, MongoDB geospatial functionality can be used to identify providers near an emergency location.

---

# Real-Time Communication

Some Lifelink functionality uses real-time communication and WebSockets.

When modifying real-time functionality:

* Avoid unnecessary connection creation.
* Handle disconnects gracefully.
* Prevent duplicate event processing.
* Validate incoming events.
* Keep event names consistent.
* Avoid broadcasting sensitive information unnecessarily.

Example event:

```text
new_emergency
```

Real-time features should also degrade gracefully where polling or another fallback mechanism is intentionally used.

---

# Emergency and Provider State Management

Emergency and service-provider states should remain explicit and predictable.

Examples include:

```text
AVAILABLE
BUSY
DISPATCHED
ARRIVED
OFFLINE
```

Emergency workflows may include states such as:

```text
SEARCHING
ASSIGNED
DISPATCHED
ARRIVED
COMPLETED
```

When modifying state transitions:

1. Identify the current state.
2. Validate whether the transition is allowed.
3. Update the relevant entity.
4. Notify dependent components where required.
5. Prevent duplicate or conflicting assignments.

State changes should be designed to avoid race conditions, particularly during emergency dispatch.

---

# Authentication and Security

Security-sensitive functionality should be handled carefully.

Contributors should:

* Never commit passwords.
* Never commit API keys.
* Never commit JWT secrets.
* Never commit database credentials.
* Never expose `.env` files containing secrets.
* Validate user input.
* Sanitize data where appropriate.
* Use secure password hashing.
* Verify authorization before privileged operations.

Sensitive configuration should be stored using environment variables.

Example:

```text
JWT_SECRET=your-secret
MONGO_URI=your-database-uri
```

Use an `.env.example` file to document required variables without exposing real credentials.

---

# Testing

Every functional change should be tested before submitting a pull request.

At minimum, verify:

* The affected service starts successfully.
* Existing functionality still works.
* API requests return expected responses.
* Invalid input is handled correctly.
* Authentication and authorization still work.
* Database operations behave as expected.
* Frontend changes do not introduce console errors.

For provider verification or dispatch logic, test both successful and failure scenarios.

Example:

```text
Valid provider
        ↓
Verification succeeds
        ↓
Provider becomes available
```

And:

```text
Invalid provider
        ↓
Verification fails
        ↓
Provider is rejected
```

---

# Git Workflow

Create a feature branch before making changes.

```bash
git checkout -b feature/your-feature-name
```

Examples:

```text
feature/geospatial-search
feature/provider-verification
feature/emergency-alerts
fix/dispatch-race-condition
fix/map-loading
docs/update-readme
```

Keep commits focused.

Before committing:

```bash
git status
```

Review your changes carefully.

Then:

```bash
git add .
git commit -m "feat: add provider verification"
```

Push the branch:

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

---

# Commit Guidelines

Use clear and descriptive commit messages.

Recommended prefixes:

```text
feat:     New functionality
fix:      Bug fix
docs:     Documentation
refactor: Code restructuring
test:     Tests
chore:    Maintenance
perf:     Performance improvement
style:    Formatting/style-only changes
```

Examples:

```text
feat: add emergency geolocation
fix: prevent duplicate provider assignment
docs: update contributing guide
test: add provider license validation tests
refactor: simplify dispatch service
chore: update dependencies
```

Avoid vague commit messages such as:

```text
changes
update
fixed stuff
final
final final
```

---

# Pull Requests

Before opening a Pull Request, make sure:

* The project builds successfully.
* The affected service starts successfully.
* Relevant tests pass.
* No secrets are committed.
* No generated dependency folders are included.
* Documentation is updated when necessary.
* The change does not unintentionally modify unrelated functionality.

A Pull Request should explain:

### What changed?

Briefly describe the implementation.

### Why was it changed?

Explain the problem or requirement.

### How was it tested?

Describe the testing performed.

### Screenshots

For frontend changes, include screenshots or a short demonstration when useful.

---

# Code Review

Reviewers may check:

* Correctness
* Maintainability
* Security
* API consistency
* Error handling
* Database impact
* Performance
* Test coverage
* Documentation
* Unintended UI or behavioral changes

Be open to requested changes and keep discussions focused on the implementation.

---

# Documentation

Documentation is considered part of the project.

Update relevant documentation when introducing:

* New APIs
* New services
* New environment variables
* New database fields
* New workflows
* New setup requirements
* Major architectural changes

Important documentation includes:

```text
README.md
CONTRIBUTING.md
API documentation
Environment variable examples
Architecture documentation
```

If an architectural change makes existing documentation inaccurate, update the documentation in the same contribution whenever practical.

---

# Environment Variables

Never commit real environment variables or credentials.

The following files should generally remain local:

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

Example:

```env
MONGO_URI=
JWT_SECRET=
PORT=
```

Do not place real secrets inside `.env.example`.

---

# Dependency Management

Before adding a new dependency, consider:

* Is it actually required?
* Is there already a dependency that provides the functionality?
* Is the package actively maintained?
* Does it introduce unnecessary security or bundle-size concerns?

After adding a dependency:

```bash
npm install package-name
```

Commit the appropriate package manifest and lockfile.

Do **not** commit:

```text
node_modules/
```

---

# Issues and Bug Reports

When reporting a bug, provide enough information to reproduce it.

Include:

### Description

What happened?

### Expected Behavior

What should have happened?

### Steps to Reproduce

Provide the smallest reliable sequence of steps.

Example:

```text
1. Start the application.
2. Register a provider.
3. Submit an invalid license ID.
4. Observe the verification response.
```

### Environment

Include relevant information such as:

```text
Operating System
Node.js version
Browser
Docker version
```

### Logs

Include relevant error messages while removing passwords, tokens, API keys, and other sensitive information.

---

# Design Principles

## 1. Modularity

Services should have clear responsibilities and boundaries.

## 2. Reliability

Emergency workflows should handle failures predictably.

## 3. Security

Authentication, authorization, credentials, and user data must be handled responsibly.

## 4. Observability

Important operational events should be understandable through logs, API responses, and dashboard states.

## 5. Maintainability

Prefer readable and understandable code over unnecessary complexity.

## 6. Minimal Coupling

Services should communicate through defined interfaces rather than relying on internal implementation details.

## 7. Human Oversight

Lifelink is intended as a software coordination and dispatch system. It should not be treated as a replacement for trained emergency personnel, medical professionals, dispatch authorities, or official emergency infrastructure.

---

# Contribution Areas

Contributions can include:

### Backend

* API improvements
* Service architecture
* Dispatch logic
* Authentication
* Provider management
* Error handling
* Performance improvements

### Frontend

* Dashboard improvements
* Map interactions
* Accessibility
* Responsive design
* Real-time status visualization

### Geospatial

* Location handling
* Provider proximity searches
* Routing integrations
* Map functionality

### Infrastructure

* Docker improvements
* Development tooling
* CI/CD
* Configuration management

### Testing

* Unit tests
* Integration tests
* API tests
* End-to-end testing

### Documentation

* README improvements
* API documentation
* Architecture documentation
* Setup instructions
* Developer guides

---

# Before You Submit

Use this checklist:

* [ ] My change addresses a specific problem or feature.
* [ ] I tested the affected functionality.
* [ ] Existing functionality still works.
* [ ] I did not commit secrets or credentials.
* [ ] I did not commit `node_modules` or generated files.
* [ ] I updated documentation where necessary.
* [ ] My commit messages are descriptive.
* [ ] My Pull Request clearly explains the change.
* [ ] Frontend changes include screenshots when useful.
* [ ] I have reviewed my own diff before submitting.

---

# Project Philosophy

Lifelink is built around a simple engineering principle:

> **Connect the right emergency response resources with the right information at the right time.**

The project focuses on demonstrating how modern web technologies, geospatial systems, distributed services, and real-time communication can work together to support emergency-response coordination.

Contributors are encouraged to prioritize:

* Reliability
* Security
* Clarity
* Modularity
* Responsible engineering
* Practical usability

---

# License



See the [`LICENSE`](LICENSE) file for the complete license text.

---

Thank you for contributing to Lifelink.
