# Phase 0 Research: PoHorseRace — Roll-A-Ball Derby

**Date**: 2026-02-24 | **Plan**: [plan.md](plan.md)

All technology choices were provided in the architectural brief. Research below
validates each decision, documents alternatives considered, and resolves any
remaining implementation unknowns before Phase 1 design.

---

## [D-001] 3D Rendering: React Three Fiber vs. Vanilla Three.js

**Decision**: React Three Fiber (R3F) with `@react-three/drei`

**Rationale**:
- Declarative scene graph fits naturally with React component model; each game
  entity (PoLane, PoHorse, PoBall) maps to a single-responsibility component.
- R3F manages the WebGL context lifecycle, resize observers, and RAF loop,
  eliminating boilerplate that violates the Zero-Waste principle.
- `@react-three/drei` provides MSDF text (required for retro LED display
  rendering without rasterization artifacts) and helper hooks for orbit controls
  used in the win-sequence camera.
- `@react-three/postprocessing` integrates the Selective Bloom pipeline directly
  into the R3F render loop with zero additional setup.

**Alternatives considered**:
- **Vanilla Three.js** — rejected: requires manual DOM/resize management and
  imperative scene mutations that scatter logic across lifecycle methods,
  increasing complexity without benefit.
- **Babylon.js** — rejected: heavier bundle, no Rapier WASM binding, broader
  API surface than needed for a single scene.

---

## [D-002] Physics: @react-three/rapier (Rapier WASM)

**Decision**: `@react-three/rapier` wrapping Rapier physics engine (WASM build)

**Rationale**:
- Rapier runs a **deterministic fixed 60 Hz timestep**, critical for consistent
  ball-on-rim collision behavior across devices (FR-016 raises metal rim).
- **Collision groups / bitmasks** allow balls to interact with lane geometry and
  rims while passing through hole-sensor triggers — required for FR-016 (rim
  circle behavior) and FR-010 (ball disappears when sensor threshold met).
- WASM execution offloads the physics computation from the JS main thread,
  maintaining 60 fps rendering even during heavy collision frames.
- Native `onContact` / `onIntersectionEnter` callbacks provide the exact impulse
  magnitude required by FR-023 (velocity-mapped clack sound).

**Critical constraint — SharedArrayBuffer**:
Rapier's WASM build uses `SharedArrayBuffer` for worker communication. Browsers
require two HTTP headers be present on every response:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
Both the Vite dev server (`vite.config.ts` → `server.headers`) and the production
host must serve these headers. This is a **non-negotiable deployment requirement**.

**Alternatives considered**:
- **cannon-es** — rejected: CPU-only, no collision groups, no deterministic step;
  ball-on-rim simulation drifts across frame rates.
- **ammo.js** — rejected: C++ Bullet port; large WASM bundle (~1.5 MB), no
  dedicated R3F bindings, manual integration overhead.
- **oimo.js** — rejected: no bitmask collision filtering; sensor triggers require
  per-tick distance checks which are expensive at 60 Hz.

---

## [D-003] State Management: Zustand with Transient Updates

**Decision**: Zustand with `subscribeWithSelector` + transient `.getState()` reads

**Rationale**:
- Physics runs at 60 Hz inside Rapier's WASM step. Emitting a React `setState`
  at 60 Hz per lane would trigger 8 × 60 = 480 re-renders/sec — unacceptable.
- Zustand's **transient update pattern** allows physics callbacks to write to the
  store via `setState` while R3F `useFrame` hooks read via `getState()` without
  subscribing to reactive updates. Only the HUD components that actually display
  numbers subscribe reactively.
- Three stores with clear boundaries (usePoRaceStore, usePoLaneStore,
  usePoBallStore) follow Constitution Principle III (Single Responsibility).

**GoF pattern**: Observer — Zustand store acts as the event bus; components and
hooks subscribe only to slices they need (Interface Segregation).

**Alternatives considered**:
- **Redux Toolkit** — rejected by constitution ("Avoid Redux unless justified
  with complexity"); the unidirectional flow adds 3× boilerplate for no gain
  in a single-scene application.
- **Jotai / Recoil** — rejected: atom-per-entity model creates 60+ atoms for
  horse positions + ball states; refactoring risk when adding multiplayer lanes.
- **React Context** — rejected: context propagation rerenders the entire subtree
  on every physics tick.

---

## [D-004] Horse Animation: react-spring/three

**Decision**: `@react-spring/three` springy position interpolation

**Rationale**:
- Horse advancement is not dictated by physics — it is a **visual metaphor** for
  accumulated score. Driving horse position from score via a spring config
  (tension/friction) produces the "organic easing" described in the blueprint
  without a separate physics body.
- `@react-spring/three` integrates with R3F's `useFrame` loop, avoiding React
  re-renders for each position tick.
- The "high-speed reverse slide" on Reset is implemented by instantly setting the
  spring target to 0 with a high-velocity config, producing the visual effect
  described in FR-006 without a separate animation system.

**GoF pattern**: Strategy — the spring config object (race mode vs. reset mode)
is swapped to produce different motion behaviors from the same interpolator.

**Alternatives considered**:
- **GSAP** — viable, but adds a non-React dependency; spring physics config is
  more expressive for "organic" motion than GSAP easing curves.
- **Framer Motion** — not designed for 3D world-space transforms; no Three.js
  integration.
- **Manual lerp in useFrame** — requires custom easing logic and lacks the
  high-quality spring simulation that gives horses "weight".

---

## [D-005] Procedural Audio: Tone.js

**Decision**: `tone` library (Tone.js) for all audio synthesis

**Rationale**:
- All sounds are generated procedurally from physical events (FR-022); no
  pre-recorded audio files are used, eliminating binary assets from the bundle
  and satisfying the Zero-Waste principle.
- Tone.js provides:
  - **PolySynth + MembraneSynth** for velocity-mapped rim clacks (FR-023):
    `pitch = BASE_FREQ + impactMagnitude * PITCH_SCALE`
  - **Noise generator (pink)** gated by a VCA envelope, controlled by ball
    velocity, for rolling friction rumble (FR-024).
  - **MetalSynth / Bell** for the winner's bell synth (FR-025).
- Tone.js handles the Web Audio API `AudioContext` start gesture requirement
  (browsers block audio until a user gesture) via `Tone.start()` on first
  pointer-down event.

**GoF pattern**: Decorator — PoAudioService wraps Tone.js instruments behind a
domain interface; logging and rate-limiting decorators can be applied without
modifying the synthesis logic.

**Alternatives considered**:
- **Raw Web Audio API** — more control but significantly more boilerplate for
  oscillator management, envelope shaping, and polyphony.
- **Howler.js** — sample-playback only; does not support procedural synthesis.

---

## [D-006] Post-Processing: Selective Bloom

**Decision**: `@react-three/postprocessing` with `SelectiveBloom` effect

**Rationale**:
- Only the red 7-segment LED segments and the gold scoring particles should glow
  (FR-020, FR-019). `SelectiveBloom` uses a **luminance threshold layer** to
  restrict bloom to meshes that opt in via a `layers` bitmask, keeping the dark
  wooden lane environment crisp.
- Configured with `luminanceThreshold: 0.7` and `intensity: 1.2` to produce
  the warm filament glow without blowing out the scene.
- The postprocessing pipeline is placed in `PoScene.tsx` as a single
  `<EffectComposer>` wrapping the entire canvas output.

**Alternatives considered**:
- **Unreal/bloom via emissive intensity** — applying very high emissive values
  causes bloom on ALL bright surfaces; lacks selectivity.
- **CSS `filter: blur` overlay** — not applicable to in-scene 3D geometry.

---

## [D-007] Routing: react-router-dom

**Decision**: `react-router-dom` v6 for `/` (PoMidway) and `/diag` (PoDiag) routes

**Rationale**:
- Two routes are required (FR-028). React Router v6 adds < 10 KB to the bundle
  and integrates with Vite's SPA fallback configuration with one line.
- The `/diag` route renders independently of the 3D canvas (PoDiag is a plain
  HTML/JSON panel), satisfying FR-004 (diag does not disrupt race state) because
  the simulation store persists across route transitions.

**Note on simulation continuity**: When navigating to `/diag`, the R3F `<Canvas>`
unmounts. Race state in Zustand persists (store is module-scoped) but the physics
simulation pauses because Rapier's RAF loop is tied to the canvas. This is
acceptable per the spec (the race continues "in the background" means state is
preserved, not that physics actively steps). On return navigation the race
resumes from the frozen state.

---

## [D-008] Portrait Lock Implementation

**Decision**: CSS `@media (orientation: landscape)` overlay + JS
`screen.orientation.lock('portrait')` API

**Rationale**:
- Two layers: (1) a CSS rule renders `<PoOrientationGuard>` (a full-screen
  overlay with a "rotate device" message) when `max-aspect-ratio: 1/1`; (2) on
  mobile, `screen.orientation.lock('portrait')` is called on the first user
  gesture to hard-lock orientation where the API is supported.
- The CSS fallback ensures the guard appears even on platforms where the lock API
  is not supported (e.g., desktop browsers).

---

## [D-009] Build & Dev: Vite Configuration

**Required `vite.config.ts` additions**:
```ts
// WASM + SharedArrayBuffer headers (D-002 constraint)
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
},
// React + R3F plugin
plugins: [react()],
// WASM support for Rapier
optimizeDeps: { exclude: ['@react-three/rapier'] },
```
Production host (Netlify / Vercel / nginx) must mirror the same two COOP/COEP
response headers. Documented in quickstart.md.

---

## Summary: All Decisions Resolved

| ID | Area | Decision | Status |
|----|------|----------|--------|
| D-001 | 3D rendering | React Three Fiber + drei | ✅ |
| D-002 | Physics | @react-three/rapier (WASM) | ✅ |
| D-003 | State | Zustand transient pattern | ✅ |
| D-004 | Animation | @react-spring/three | ✅ |
| D-005 | Audio | Tone.js procedural synthesis | ✅ |
| D-006 | Post-FX | @react-three/postprocessing Selective Bloom | ✅ |
| D-007 | Routing | react-router-dom v6 | ✅ |
| D-008 | Portrait lock | CSS media query + orientation API | ✅ |
| D-009 | Build | Vite + COOP/COEP headers | ✅ |

Zero `NEEDS CLARIFICATION` items remain. Phase 1 design may proceed.
