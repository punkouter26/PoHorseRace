<!--
SYNC IMPACT REPORT
==================
Version change  : (new) -> 1.0.0
Modified princi.: N/A - initial fill from blank template
Added sections  : Core Principles (I-VI), Technology Stack, Development Workflow, Governance
Removed sections: All placeholder tokens and example comments
Templates updated:
  ✅ .specify/memory/constitution.md        - this file
  ✅ .specify/templates/plan-template.md    - Constitution Check gate populated
  ✅ .specify/templates/spec-template.md    - offline resilience FR note added
  ✅ .specify/templates/tasks-template.md   - Phase 1 service-layer scaffold tasks added;
                                              Phase N zero-waste/offline/SOLID audit tasks added
Deferred TODOs  : none
-->

# PoHorseRace Constitution

## Core Principles

### I. Zero-Waste Codebase (NON-NEGOTIABLE)

Every file, export, dependency, and asset MUST serve an active purpose.

- Dead code, unused imports, orphaned components, and obsolete assets MUST be
  deleted - not commented out.
- Before adding any abstraction, confirm it is consumed by at least one real caller.
- Dependency lists (package.json, requirements.txt, etc.) MUST contain only
  packages that are actually imported at runtime or build-time.

**Rationale**: Unused code rots silently, misleads contributors, and inflates
bundle sizes. A zero-waste posture keeps the codebase navigable and auditable.

### II. API-Resilient React Client (NON-NEGOTIABLE)

The React client MUST remain fully functional when no API is reachable.

- A dedicated offline/mock data layer (e.g., `src/services/mockData.ts`) MUST
  provide seed data for every API-backed resource consumed by the UI.
- All API calls MUST be wrapped in a service abstraction (Strategy / Adapter
  pattern) so the live implementation can be swapped for the mock without
  touching any component.
- The app MUST detect connectivity failures gracefully and fall back to mock
  data with a visible, non-intrusive indicator (e.g., "Running in demo mode"
  banner).
- No component MAY call `fetch`, `axios`, or any HTTP client directly - all
  network access MUST flow through the service layer.

**Rationale**: Demos, offline development, and CI tests MUST all work without
a live backend. Tight coupling to a live API is a deployment risk.

### III. SOLID Design

All modules, classes, and React components MUST follow SOLID principles:

- **S** - Single Responsibility: each module/component owns exactly one concern.
- **O** - Open/Closed: extend behavior via composition or new implementations;
  avoid modifying existing stable interfaces.
- **L** - Liskov Substitution: subtypes MUST be substitutable for their base
  types (critical for live vs. mock service swapping).
- **I** - Interface Segregation: prefer narrow, focused interfaces over broad
  ones.
- **D** - Dependency Inversion: depend on interfaces/contracts, not concrete
  implementations (directly enables Principle II's service abstraction).
- Every public interface and non-trivial function MUST carry an explanatory
  comment stating its purpose and any invariants.

**Rationale**: SOLID boundaries prevent cascading changes and make every layer
independently testable.

### IV. GoF Design Patterns (Apply Deliberately)

GoF patterns MUST be applied where they solve a real problem. Each usage MUST
be annotated with a comment identifying the pattern name and its purpose.

Commonly expected patterns in this project:

- **Strategy** - swapping live vs. mock API service implementations (Principle II).
- **Observer / Event Emitter** - reacting to race-state changes without tight coupling.
- **Factory** - constructing domain objects (Horse, Race, Bet) from raw API payloads.
- **Decorator** - adding cross-cutting concerns (logging, caching) without altering
  core logic.

Patterns MUST NOT be applied speculatively; include a justification comment.

**Rationale**: Named patterns communicate design intent immediately to experienced
developers and reduce ramp-up time for new contributors.

### V. Test-Quality Gate

- Unit tests MUST cover all service-layer logic and pure utility functions.
- Integration tests MUST cover the live-vs-mock switching path to confirm the
  app renders correctly in both modes.
- Tests MUST be written before the implementation they target (Red -> Green -> Refactor).
- Zero test failures MUST be the gate for merging to the main branch.

**Rationale**: Tests are the executable specification; they verify correctness
and guarantee that the offline fallback actually functions.

### VI. Observability & Simplicity

- All service calls (live and mock) MUST emit structured log entries:
  `{ timestamp, level, service, action, durationMs, status }`.
- Components MUST log user-initiated actions (race start, bet placement, etc.)
  at INFO level.
- Errors MUST be logged at ERROR level with a stack trace before being surfaced
  to the UI.
- YAGNI applies: do not add screens, services, or data fields until a user story
  demands them.

**Rationale**: Structured observability makes debugging feasible without a
debugger attached; YAGNI keeps the surface area small and the zero-waste rule
enforceable.

## Technology Stack

| Layer         | Technology                                  | Constraint                                     |
|---------------|---------------------------------------------|------------------------------------------------|
| Frontend      | React (TypeScript, strict mode)             | Required                                       |
| Styling       | CSS Modules or Tailwind (decide in plan)    | Confirm in first feature plan                  |
| State         | React Context + hooks (or Zustand)          | Avoid Redux unless justified with complexity   |
| API client    | Axios wrapped by service layer              | Never called from components directly           |
| Mock layer    | In-memory seed data module                  | Required by Principle II                       |
| Testing       | Vitest + React Testing Library              | Jest-compatible                                |
| Backend API   | TBD (Node/Express or equivalent)            | Must expose REST or GraphQL                    |
| Linting/fmt   | ESLint + Prettier                           | Enforced in CI; zero warnings policy           |

All technology choices MUST be documented in the relevant plan.md before coding
begins. Ad-hoc dependency additions to package.json without an associated plan
entry are a Principle I violation.

## Development Workflow

- **Branch naming**: `###-short-description` (e.g., `001-race-lobby`).
- **PR merge requirements**:
  1. All tests pass (`npm test` or equivalent).
  2. No ESLint errors or Prettier violations.
  3. Constitution Check section in plan.md completed and reviewed.
  4. No new dead code introduced (Principle I).
  5. Offline/demo mode verified by integration test or manual QA (Principle II).
  6. GoF/SOLID comment coverage reviewed by at least one reviewer (Principles III & IV).
- **Commit messages**: Conventional Commits format
  (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- **Definition of Done**: A story is done when all acceptance scenarios pass AND
  the offline fallback works without code modification.

## Governance

This constitution supersedes all other coding conventions or informal practices
in this repository.

- Amendments MUST increment the version using Semantic Versioning:
  - **MAJOR**: Principle removal or redefinition that breaks existing contracts.
  - **MINOR**: New principle, new mandatory section, or materially expanded guidance.
  - **PATCH**: Clarifications, wording improvements, or typo corrections.
- Every amendment MUST update the Sync Impact Report HTML comment at the top of
  this file and propagate changes to plan-template.md, spec-template.md, and
  tasks-template.md within the same PR.
- Complexity that violates any principle MUST be justified in the plan.md
  Complexity Tracking table with a named business reason. Undocumented violations
  are grounds for PR rejection.
- Runtime development guidance lives in `.specify/templates/agent-file-template.md`.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
