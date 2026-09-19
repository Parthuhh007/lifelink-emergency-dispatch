# Contributing to LIFELINK

Thank you for your interest in contributing to **LIFELINK — Agentic AI Emergency Response & Coordination Platform**.

## 1. Core Principles & Safety Requirements
Before contributing, please read [`AGENTS.md`](./AGENTS.md).
- **Non-Autonomous Medical Decisions**: LIFELINK is an emergency coordination and resource matching layer. Code must never issue medical diagnoses, drug prescriptions, or clinical treatment plans.
- **Human-in-the-Loop State Machine**: All critical decisions must follow:
  `RECOMMENDED` → `WAITING FOR HUMAN CONFIRMATION` → `APPROVED` / `REJECTED`.
- **Strict Layering**:
  `UI -> API -> Orchestrator -> Agents -> Tools -> External Integration Adapters -> Database`
  Agents must never touch the database directly; only through typed tools.
- **De-identified Data Only**: Never commit real patient identifiers or sensitive clinical records.

## 2. Development Workflow
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/lifelink.git
   cd lifelink
   ```
3. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Or on Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Run tests:
   ```bash
   python -m pytest backend/tests -v
   ```
5. Create a topic branch:
   ```bash
   git checkout -b feature/agent-optimization
   ```
6. Commit your changes following conventional commit syntax:
   `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

## 3. Pull Request Guidelines
- Ensure all pytest unit and integration tests pass.
- Maintain UTC storage for any new datetime fields.
- Include unit tests for any new tool, agent, or adapter.
- Ensure WCAG 2.1 AA contrast compliance for UI modifications.
