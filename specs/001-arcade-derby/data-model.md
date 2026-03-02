# Data Model: PoHorseRace — Roll-A-Ball Derby

**Date**: 2026-02-24 | **Plan**: [plan.md](plan.md) | **Spec entities**: spec.md § Key Entities

All types are defined in `src/types/po-types.ts` and shared across components,
stores, and services. The Po prefix is applied to every identifier per FR-033.
No persistence layer exists in v1.0; all state is ephemeral in-session.

---

## Entities

### PoRaceState (FSM)

Represents the top-level finite state machine for a single game session.

```ts
// Finite states for the race lifecycle (FR-001)
type PoRacePhase = 'Idle' | 'Countdown' | 'Racing' | 'Finished';

interface PoRaceState {
  phase: PoRacePhase;
  elapsedSeconds: number;   // count-up stopwatch; 0 until Racing; frozen at Finished (FR-002b)
  countdownValue: number | null; // 3, 2, 1 during Countdown; null otherwise (FR-002)
  winnerLaneId: number | null;   // lane number 1-8; null until Finished (FR-004)
}
```

**State transitions**:
```
Idle ──[RESET pressed]──► Countdown ──[tick complete]──► Racing ──[60" crossed]──► Finished
Finished ──[RESET pressed]──► Idle   (all lanes slide to 0 first via FR-006)
Racing   ──[RESET pressed]──► Idle   (race cancelled mid-session)
```

**Validation rules**:
- `elapsedSeconds` MUST NOT increment while `phase !== 'Racing'`.
- `winnerLaneId` MUST be null for all phases except `Finished`.
- `countdownValue` MUST be 3 → 2 → 1 → null in strict sequence.

---

### PoLane

One of eight physical channels. Only lane 1 is player-controlled in v1.0.

```ts
interface PoLane {
  id: number;               // 1–8 (lane 1 = player)
  color: PoLaneColor;       // see enum below
  positionInches: number;   // 0.0–60.0 (FR-003, FR-004)
  score: number;            // cumulative points scored in this session
  rank: number;             // 1–8 calculated by PoLeaderboard util
  isPlayerControlled: boolean; // true only for lane 1 in v1.0 (FR-014, clarified 2026-02-24)
  goldGlowActive: boolean;  // true when positionInches >= 60 (FR-004)
}

// Po-prefixed enum for lane colors (FR-033)
type PoLaneColor =
  | 'PoRed'    // lane 1 — player (FR-014)
  | 'PoBlue'   // lane 2
  | 'PoYellow' // lane 3
  | 'PoGreen'  // lane 4
  | 'PoOrange' // lane 5
  | 'PoPurple' // lane 6
  | 'PoPink'   // lane 7
  | 'PoWhite'; // lane 8
```

**Validation rules**:
- `positionInches` MUST be clamped to [0, 60].
- `goldGlowActive` MUST become `true` when `positionInches >= 60` and MUST
  remain `true` until the next Reset.
- Only `id === 1` may have `isPlayerControlled = true` in v1.0.
- All lanes with `isPlayerControlled = false` MUST hold `positionInches = 0`
  throughout a single-player race.

---

### PoBall

One of up to three active balls managed by the three-ball economy (FR-007).

```ts
type PoBallPhase = 'InTrough' | 'InFlight' | 'Scoring' | 'Returning';

interface PoBall {
  id: number;                       // 0, 1, 2
  phase: PoBallPhase;
  positionX: number;                // playfield X coordinate (world units)
  positionY: number;                // playfield Y coordinate (world units)
  velocityX: number;                // current velocity component
  velocityY: number;                // current velocity component
  releaseSpeedMph: number | null;   // impulse magnitude at release; null before first roll
                                    // used to compute Summary Card "Avg Roll Speed" (FR-005, clarified 2026-02-24)
  returnTimerSeconds: number | null;// countdown to chute return (3.0 when Scoring begins, FR-010)
}
```

**Validation rules**:
- At most 3 `PoBall` instances exist simultaneously (FR-007).
- `releaseSpeedMph` MUST be set once per roll at the swipe-release event (FR-009)
  and MUST NOT be updated while the ball is in flight.
- `returnTimerSeconds` MUST be exactly `3.0` when `phase` transitions to
  `Scoring` and MUST tick down at 1 Hz; at `0.0` the ball transitions to
  `InTrough` and resets position (FR-010).
- `PoBall` with `phase === 'InTrough'` MUST prevent new aiming input when
  all 3 balls are in `InFlight` or `Scoring` or `Returning` phase (FR-007).

---

### PoScoringHole

One of five target holes in the pyramid arrangement (FR-015).

```ts
type PoHoleRow = 'Apex' | 'Middle' | 'Base';

interface PoScoringHole {
  id: number;          // 1–5
  row: PoHoleRow;      // Apex (x1 = 3pts), Middle (x2 = 2pts), Base (x2 = 1pt)
  pointValue: 1 | 2 | 3;
  rimCollisionActive: boolean; // true while a ball is circling the rim (FR-016)
  sensorTriggered: boolean;    // true for one tick when ball sensor fires (FR-010)
}
```

**Validation rules**:
- Exactly 1 Apex hole (3pt), 2 Middle holes (2pt), 2 Base holes (1pt) MUST exist.
- `pointValue` is derived deterministically from `row`; it MUST NOT be
  independently overridable at runtime.

---

### PoInchMarker

One of sixty ridges along the playfield (FR-017). Primarily a geometry + audio
trigger entity; no complex state.

```ts
interface PoInchMarker {
  id: number;          // 1–60 (position === id inches from trough end)
  audioTriggered: boolean; // true for one tick when a ball rolls over this marker (FR-024)
}
```

---

### PoDiegeticButton

A 3D in-world control button (FR-026, FR-027).

```ts
type PoDiegeticAction = 'RESET' | 'DIAG';

interface PoDiegeticButton {
  label: PoDiegeticAction;
  depressProgress: number;  // 0.0 (up) → 1.0 (fully depressed); drives mesh Y offset
  isPressed: boolean;       // true during the depress animation frame
}
```

**Validation rules**:
- `depressProgress` animates from 0 → 1 over ~100 ms then snaps back to 0.
- The bound action MUST NOT fire until `depressProgress` first reaches 1.0
  (visual confirmation before action, FR-027).

---

### PoHorse

3D horse primitive on the Horse Wall; driven by `PoLane.positionInches` via a
react-spring interpolator.

```ts
interface PoHorse {
  laneId: number;          // 1–8, mirrors PoLane.id
  color: PoLaneColor;      // mirrors PoLane.color
  targetPositionInches: number;  // spring target; updated when PoLane.positionInches changes
  goldGlowActive: boolean; // mirrors PoLane.goldGlowActive; drives Selective Bloom layer
}
```

---

### PoParticlePoof

A single transient particle-burst event (FR-019). Not persisted; created at score
and removed when all particles have faded.

```ts
interface PoParticlePoof {
  id: string;              // unique per scoring event (timestamp + holeId)
  originX: number;         // world X of the scoring hole center
  originY: number;         // world Y of the scoring hole center; particles rise from here
  spawnedAt: number;       // performance.now() timestamp
  lifetimeMs: number;      // e.g. 1200; particles fade to 0 opacity before this elapses (FR-005 SC-005)
}
```

---

### PoDiagSnapshot

Point-in-time telemetry record for the `/diag` route (FR-028, FR-029, FR-030).

```ts
interface PoDiagSnapshot {
  poCapturedAt: string;      // ISO 8601 timestamp (Po-prefixed key per FR-033)
  poFps: number;             // frames per second at capture time
  poGeometryCount: number;   // active Three.js geometries in the scene
  poHorsePositions: Array<{
    laneId: number;
    positionInches: number;
  }>;
  poSessionId: string;       // MASKED before render: "P***2" format (FR-030)
  poUserId: string | null;   // MASKED before render; null if no user in v1.0
}
```

**Masking rule** (implemented by `PoMaskString` utility, FR-030):
- Input `"P0X9K2"` → output `"P***2"` (first char + `***` + last char).
- Applied to `poSessionId` and `poUserId` before the snapshot object is passed
  to the render layer; raw values MUST NOT exist in rendered JSX.

---

### PoSummaryStats

Calculated once when `PoRaceState.phase` transitions to `Finished` (FR-005).
Stored in `usePoRaceStore` and rendered by `PoSummaryCard`.

```ts
interface PoSummaryStats {
  totalSprintTimeSeconds: number;   // = PoRaceState.elapsedSeconds at finish
  accuracyPercent: number;          // (ballsScored / ballsThrown) * 100, rounded 1dp
  avgRollSpeedMph: number;          // mean of all PoBall.releaseSpeedMph values, rounded 1dp
}
```

---

## Entity Relationships

```
PoRaceState
  └─ 1 : 8 ──► PoLane (id 1–8)
                 └─ 1 : 1 ──► PoHorse   (visual representation on wall)
                 └─ 0..3 ──► PoBall     (balls belonging to player lane 1 only)

PoTargetTriangle
  └─ 1 : 5 ──► PoScoringHole

PoPlayfield
  └─ 1 : 60 ──► PoInchMarker

PoScene
  └─ 0..N ──► PoParticlePoof  (ephemeral; created on score, auto-removed)

PoRaceState (Finished)
  └─ 1 : 1 ──► PoSummaryStats

PoDiagService
  └─ on-demand ──► PoDiagSnapshot (snapshot captured per /diag render cycle)
```

---

## State Transitions Summary

| Entity | Trigger | State Change |
|--------|---------|--------------|
| PoRaceState | RESET pressed (Idle) | phase: Idle → Countdown |
| PoRaceState | Countdown complete | phase: Countdown → Racing; elapsedSeconds starts |
| PoRaceState | PoLane.positionInches >= 60 | phase: Racing → Finished; winnerLaneId set |
| PoRaceState | RESET pressed (Finished/Racing) | phase → Idle; all lanes reset to 0 |
| PoBall | Swipe release | phase: InTrough → InFlight; releaseSpeedMph recorded |
| PoBall | Sensor trigger | phase: InFlight → Scoring; returnTimerSeconds = 3.0 |
| PoBall | returnTimerSeconds reaches 0 | phase: Scoring → Returning → InTrough |
| PoBall | Ball exits lane without scoring | phase: InFlight → Returning → InTrough |
| PoLane (id=1) | Ball scores N pts | positionInches += N * INCHES_PER_POINT |
| PoLane (id=1) | positionInches >= 60 | goldGlowActive = true; triggers PoRaceState finish |
| PoDiegeticButton | Pointer-down | depressProgress animates 0 → 1; action fires at 1.0 |
