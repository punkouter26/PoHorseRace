# Implementation Plan: PoHorseRace — Roll-A-Ball Derby (Full Application)

**Branch**: `001-arcade-derby` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-arcade-derby/spec.md`

## Summary

Build a standalone, portrait-locked 3D browser game that recreates a classic
carnival boardwalk horse-race machine. One player rolls up to three balls up a
ten-degree inclined lane toward a five-hole scoring triangle; each score advances
a horse on a vertical Horse Wall backdrop. Eight lanes are rendered but only lane 1
(Red) is player-controlled in v1.0; lanes 2–8 are static visual placeholders.
The application is entirely offline-first: all physics, procedural audio, race
logic, and rendering execute in-browser with no network round-trips.

The stack uses React 19 + TypeScript on a Vite dev pipeline, with React Three
Fiber (R3F) for the declarative 3D scene, @react-three/rapier (WASM) for 60 Hz
deterministic physics, Zustand for transient state sync, react-spring for horse
animation easing, Tone.js for procedural audio synthesis, and
@react-three/postprocessing for Selective Bloom on LEDs and particles.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, noUnusedLocals, noUnusedParameters)
**Primary Dependencies**:
- react@19, react-dom@19
- three@latest, @react-three/fiber@latest
- @react-three/drei (camera, MSDF text, helpers)
- @react-three/rapier (WASM Rapier — 60 Hz physics step)
- @react-three/postprocessing (Selective Bloom pipeline)
- react-spring/three (horse position interpolation)
- zustand (transient store updates — no React re-render on physics tick)
- tone (procedural audio synthesis)
- react-router-dom (/ and /diag routes)
**Storage**: None (session state is ephemeral; localStorage optional for hi-score,
  out of scope for v1.0)
**Testing**: Vitest + @testing-library/react; @testing-library/three for R3F units
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
  supporting WebGL 2 and Web Audio API; portrait orientation 667 px–932 px tall
**Project Type**: Offline-first single-page web application (3D game client)
**Performance Goals**: 60 fps during active race; < 3 s cold load on mid-tier device;
  < 500 ms /diag telemetry latency vs. live simulation
**Constraints**:
- WASM (Rapier) requires `Cross-Origin-Opener-Policy: same-origin` +
  `Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer.
  Vite dev-server and production host MUST serve these headers.
- Portrait-lock enforced via CSS + JS orientation lock API.
- Zero network requests at runtime (FR-031, FR-032).
- Po prefix on all CSS scope identifiers, diagnostic keys, and solution-level names
  (FR-033).
**Scale/Scope**: Single-player; one browser tab; ~30 interactive 3D meshes;
  8 Horse Wall primitives; 60 InchMarker ridges; 3 Ball meshes; 5 ScoringHole
  cylinders; 2 DiegeticButton meshes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**PoHorseRace Constitution v1.0.0 — mandatory gates:**

| # | Gate | Status | Notes |
|---|------|--------|-------|
| I | No dead code, unused imports, or orphaned assets introduced | ✅ | Fresh project; ESLint noUnusedLocals enforces at build time |
| II | Every new API call goes through the service layer | ✅ | App has NO network API calls. Service layer exists for audio (PoAudioService), diagnostics (PoDiagService), and seed state (PoSeedService). The offline-first design satisfies the spirit of this principle vacuously — there is no live vs. mock swap needed because no HTTP endpoint exists. GoF Strategy pattern still applied across all three services. |
| II | Offline/mock fallback exists for every new API-backed resource | ✅ | PoSeedService provides initial game state; full simulation runs in-browser. No external data dependency exists. |
| III | All new classes/modules follow SOLID; explanatory comments on public interfaces | ☐ | Enforced during implementation review |
| IV | Any GoF pattern applied is annotated with pattern name + justification | ☐ | See GoF decisions in research.md |
| V | Tests written before implementation; offline + live paths covered | ☐ | Vitest; TDD cycle required per constitution |
| VI | Structured log entries emitted by all new service calls | ☐ | PoLogger utility required at service boundary |

## Project Structure

### Documentation (this feature)

```text
specs/001-arcade-derby/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entity model
├── quickstart.md        # Phase 1 — dev setup + run guide
├── contracts/
│   └── diag-snapshot.schema.json   # /diag telemetry JSON schema
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
PoHorseRace/                    # repo root — Po prefix (FR-033)
├── index.html
├── vite.config.ts              # COOP/COEP headers + WASM plugin
├── tsconfig.json               # strict: true, noUnusedLocals, noUnusedParameters
├── .eslintrc.cjs
├── .prettierrc
│
├── src/
│   ├── main.tsx                # React root; BrowserRouter
│   │
│   ├── pages/
│   │   ├── PoMidway.tsx        # / — primary game canvas (R3F Canvas)
│   │   └── PoDiag.tsx          # /diag — diagnostics vault
│   │
│   ├── components/             # R3F scene components (one concern each — SOLID S)
│   │   ├── PoScene.tsx         # Root <Canvas> + <Physics> + post-processing
│   │   ├── PoLane.tsx          # Inclined playfield mesh (10° tilt)
│   │   ├── PoInchMarker.tsx    # Single ridge primitive (x60 instances)
│   │   ├── PoTrough.tsx        # Ball trough container + ball spawn
│   │   ├── PoTargetTriangle.tsx# Scoring triangle board
│   │   ├── PoScoringHole.tsx   # Single hole + rim + sensor trigger (x5)
│   │   ├── PoHorseWall.tsx     # Backdrop wall + 8 lane slots
│   │   ├── PoHorse.tsx         # Single horse primitive (procedural geometry)
│   │   ├── PoLedDisplay.tsx    # MSDF seven-segment LED (timer + rank)
│   │   ├── PoBall.tsx          # Ball mesh + RigidBody; scuff material
│   │   ├── PoDiegeticButton.tsx# 3D button mesh + depress animation
│   │   ├── PoParticlePoof.tsx  # Gold particle system (FR-019)
│   │   ├── PoSummaryCard.tsx   # Floating 3D post-race card (FR-005)
│   │   ├── PoCameraRig.tsx     # Fixed race cam + orbit win-sequence cam
│   │   └── PoOrientationGuard.tsx # Portrait-lock overlay (FR-013)
│   │
│   ├── store/                  # Zustand — transient physics sync
│   │   ├── usePoRaceStore.ts   # Race FSM: state, elapsedSeconds, winnerId
│   │   ├── usePoLaneStore.ts   # Per-lane position, score, rank
│   │   └── usePoBallStore.ts   # Ball states (InTrough/InFlight/Scoring/Returning)
│   │
│   ├── services/               # Strategy-pattern service layer (constitution II)
│   │   ├── PoAudioService.ts   # Tone.js procedural synth (FR-022–FR-025)
│   │   ├── PoDiagService.ts    # DiagSnapshot capture + field masking (FR-028–030)
│   │   └── PoSeedService.ts    # Initial game state seed (offline-first baseline)
│   │
│   ├── hooks/
│   │   ├── usePoSwipeInput.ts  # Pointer events → impulse vector
│   │   ├── usePoPhysicsSync.ts # Rapier onContact → Zustand transient update
│   │   └── usePoOrbitCamera.ts # Win-sequence camera lerp
│   │
│   ├── utils/
│   │   ├── PoLogger.ts         # Structured log { timestamp, level, service, action, durationMs, status }
│   │   ├── PoMaskString.ts     # Sensitive-field masker (FR-030)
│   │   ├── PoMphConverter.ts   # Internal units → mph display
│   │   └── PoLeaderboard.ts    # Rank calculation (sort by position desc)
│   │
│   └── types/
│       └── po-types.ts         # All shared TypeScript interfaces
│
└── tests/
    ├── integration/
    │   ├── PoRaceLoop.test.tsx  # Full Idle→Racing→Finished→Idle cycle
    │   └── PoBallEconomy.test.tsx # 3-ball limit + chute return timing
    └── unit/
        ├── PoMaskString.test.ts
        ├── PoMphConverter.test.ts
        ├── PoLeaderboard.test.ts
        ├── PoDiagService.test.ts
        └── PoAudioService.test.ts
```

**Structure Decision**: Frontend-only single-project layout. No `backend/` directory
exists because the application is fully offline-first (FR-031, FR-032) — all
simulation runs in the browser. The `services/` layer still upholds Constitution
Principle II: PoAudioService, PoDiagService, and PoSeedService are the abstraction
boundaries, using the Strategy pattern so each can be independently swapped or
mocked in tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| WASM physics engine (@react-three/rapier) | Deterministic 60 Hz step with ball-on-rim collision layers is physically impossible with CPU-JS alternatives at 60 fps | cannon-es/ammo.js lack collision group bitmasking needed for sensor-hole triggers; CPU overhead causes frame drops on mid-tier hardware |
| SharedArrayBuffer COOP/COEP headers | Required by browser security model for WASM threading (Rapier uses SAB internally) | Cannot be avoided; host and dev server must both be configured |
| react-spring alongside Zustand | Horse position interpolation requires organic easing (spring physics) separate from the rigid-body simulation; Zustand transient updates feed react-spring targets without triggering full React re-render cascade | CSS transitions cannot operate on 3D world-space coordinates; R3F useFrame loop alone causes excessive re-renders at 60 Hz if Zustand is not used with transient subscriptions |
