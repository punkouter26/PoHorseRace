# Tasks: PoHorseRace — Roll-A-Ball Derby (Full Application)

**Input**: Design documents from `specs/001-arcade-derby/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Branch**: `001-arcade-derby`
**Generated**: 2026-02-24

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (e.g., [US1]–[US5]) — setup and foundational tasks carry no story label
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Vite + React 19 + TypeScript project with all dependencies
and mandatory COOP/COEP headers required for Rapier WASM SharedArrayBuffer.

- [X] T001 Scaffold Vite project: `npm create vite@latest PoHorseRace -- --template react-ts` at repo root
- [X] T002 Install all runtime dependencies: `react@19 react-dom@19 three @react-three/fiber @react-three/drei @react-three/rapier @react-three/postprocessing @react-spring/three zustand tone react-router-dom`
- [X] T003 [P] Install all dev dependencies: `vitest @testing-library/react @react-three/test-renderer jsdom eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks`
  *(H4 fix: `@testing-library/three` does not exist on npm — use `@react-three/test-renderer` for R3F unit testing)*
- [X] T004 [P] Configure `vite.config.ts` + `vitest.config.ts` — COOP/COEP headers, `optimizeDeps.exclude: ['@react-three/rapier']`; Vitest test block split to `vitest.config.ts` (mergeConfig pattern) to avoid vitest/vite dual-type conflict
- [X] T005 [P] Configure `tsconfig.json` — set `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `target: ES2020`
- [X] T006 [P] Configure `eslint.config.js` (ESLint v9 flat config) — zero-warnings policy; `@typescript-eslint/recommended`; `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` rules
- [X] T007 [P] Create `.prettierrc` — `{ "semi": true, "singleQuote": true, "printWidth": 100 }`
- [X] T008 Create full source directory structure per plan.md: `src/pages/`, `src/components/`, `src/store/`, `src/services/`, `src/hooks/`, `src/utils/`, `src/types/`, `tests/integration/`, `tests/unit/`
- [X] T009 [P] Add portrait-lock base CSS in `src/index.css` — `html, body { overflow: hidden; touch-action: none; }` + `@media (orientation: landscape)` overlay rule
- [X] T010 Update `index.html` — set `<title>PoHorseRace</title>` and add `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`

**Checkpoint**: `npm run dev` starts without errors; COOP/COEP headers visible in DevTools Network tab

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared TypeScript types, utility functions, Zustand stores, service stubs,
router setup, and the R3F canvas shell that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T011 Create `src/types/po-types.ts` — define all shared interfaces and enums from data-model.md: `PoRacePhase`, `PoRaceState`, `PoLaneColor`, `PoLane`, `PoBallPhase`, `PoBall`, `PoHoleRow`, `PoScoringHole`, `PoHorse`, `PoInchMarker`, `PoDiegeticButton`, `PoParticlePoof`, `PoDiagSnapshot`, `PoSummaryStats`
- [X] T012 [P] Create `src/utils/PoLogger.ts` — structured log emitter: `PoLogger.log({ timestamp, level, service, action, durationMs, status })` writing to `console.debug` in dev and silenced in prod; exported as singleton; SOLID S — no formatting logic inside (Constitution Principle VI)
- [X] T013 [P] Create `src/utils/PoMaskString.ts` — export `poMaskString(value: string): string` that replaces middle characters with `***`, returning `first + '***' + last`; handles edge cases (≤2 chars: mask all but last)
- [X] T014 [P] Create `src/utils/PoMphConverter.ts` — export `poToMph(impulseUnits: number): number` using calibration constant derived from Rapier unit scale; export `poFromMph(mph: number): number` for inverse
- [X] T015 [P] Create `src/utils/PoLeaderboard.ts` — export `poCalcRanks(lanes: PoLane[]): Map<number, number>` sorting by `positionInches` descending; equal positions share rank; returns lane-id → rank Map
- [X] T016 Create `src/store/usePoRaceStore.ts` — Zustand store for `PoRaceState`: `phase`, `elapsedSeconds`, `countdownValue`, `winnerLaneId`; expose `startCountdown()`, `tickCountdown()`, `startRace()`, `tickElapsed()`, `finishRace(laneId)`, `resetRace()` actions; use transient-safe `setState`; `finishRace(laneId)` MUST guard with `if (get().phase === 'Finished') return;` to prevent double-fire from concurrent T033/T052 triggers (M3 fix)
- [X] T017 [P] Create `src/store/usePoLaneStore.ts` — Zustand store for 8 `PoLane` records keyed by id; initialise from `PoSeedService.seedLanes()`; expose `addScore(laneId, points)`, `setPosition(laneId, inches)`, `setGoldGlow(laneId, active)`, `resetAllLanes()` actions; `subscribeWithSelector` for HUD use
- [X] T018 [P] Create `src/store/usePoBallStore.ts` — Zustand store for 3 `PoBall` records; add `sessionReleaseSpeedsMph: number[]` accumulator field (H2 fix); expose `setPhase(ballId, phase)`, `setReleaseSpeed(ballId, mph)` (appends to `sessionReleaseSpeedsMph` — never erases individual entries), `tickReturn(ballId)`, `resetAll()` (clears accumulator) actions; enforce 3-ball cap in store selectors; accumulator feeds `PoSummaryStats.avgRollSpeedMph` at race finish
- [X] T019 Create `src/services/PoSeedService.ts` — **Strategy pattern** (annotate with `// GoF Strategy — offline-first seed replaces absent HTTP response`): `seedRaceState(): PoRaceState`, `seedLanes(): PoLane[]`, `seedBalls(): PoBall[]`; returns deterministic initial state; PoLogger call on each seed method
- [X] T020 [P] Create `src/services/PoDiagService.ts` — **Strategy pattern** stub: `captureSnapshot(): PoDiagSnapshot`; reads Zustand `getState()` transient values; applies `poMaskString` to `poSessionId` and `poUserId`; PoLogger call; leaves FPS and geometry count as 0 until US5 wires real R3F stats
- [X] T021 [P] Create `src/services/PoAudioService.ts` — **Decorator pattern** stub wrapping Tone.js (annotate `// GoF Decorator — wraps Tone.js synthesisers behind a domain-specific audio interface`): exports `poAudioService` singleton with `init()` (calls `Tone.start()` — MUST be invoked on first user gesture), `playRimClack(velocity: number)`, `playRumble(speed: number)`, `stopRumble()`, `playWinnerBell()`; methods are no-ops until `init()` called; PoLogger call per method
- [X] T022 Create `src/main.tsx` — React 19 `createRoot`; wrap in `<BrowserRouter>`; routes: `/` → `<PoMidway />` and `/diag` → `<PoDiag />`; import global CSS
- [X] T023 Create `src/components/PoScene.tsx` — R3F `<Canvas>` with `gl={{ antialias: true }}`, `camera={{ fov: 60 }}`; offline pill (C2 fix); `<PoOrientationGuard />`; Physics + EffectComposer deferred to Phase 4/5 shell (children constraint — added when content exists)
- [X] T024 [P] Create `src/components/PoOrientationGuard.tsx` — subscribes to `window.screen.orientation`; if landscape renders a full-viewport `<Html>` overlay (from `@react-three/drei`) with "Please rotate your device to portrait mode"; otherwise renders `null`
- [X] T025 Create `src/pages/PoMidway.tsx` — renders `<PoScene />`; no other logic yet
- [X] T026 [P] Create `src/pages/PoDiag.tsx` — shell: renders `<pre>Loading telemetry…</pre>` placeholder; full implementation in US5 (T070) *(H1 fix: was incorrectly referencing T076 which is the production build task)*
- [X] T027 Write unit tests for all utilities in `tests/unit/`: `PoMaskString.test.ts` (T013 contract), `PoMphConverter.test.ts` (round-trip accuracy), `PoLeaderboard.test.ts` (tie-break, all-zero, sequential ordering)
- [X] T027b [P] Create `src/hooks/usePoConnectivity.ts` — since this app is permanently offline-first (FR-031), hook always returns `{ isOffline: true, mode: 'offline' as const }`; mount a static `<Html>` drei overlay pill in `PoScene.tsx` with label "Offline Mode" positioned bottom-right, `po-offline-pill` CSS class, low opacity; satisfies Constitution Principle II MUST: *visible, non-intrusive indicator* (C2 fix — cannot be waived as "vacuously satisfied")

**Checkpoint**: `npm test` passes for all utility unit tests; `npm run dev` shows blank canvas with COOP/COEP headers; orientation guard renders overlay in landscape simulation; "Offline Mode" pill visible in bottom-right corner

---

## Phase 3: User Story 1 — Complete Race Session (Priority: P1) 🎯 MVP

**Goal**: Full game loop Idle → Countdown (3-2-1 LED) → Racing (count-up timer, horse advances) → Finished (gold glow, orbit camera, Summary Card) → Reset (horse slides back) → Idle.

**Independent Test**: Launch app offline; press RESET; verify 3-2-1 countdown on LED displays; roll mock scores; verify lane 1 horse advances to 60"; orbit camera activates; Summary Card shows Sprint Time, Accuracy %, Avg Speed mph; press RESET; horse slides back to 0"; app returns to Idle.

- [X] T028 [P] [US1] Create `src/components/PoHorse.tsx` — procedural 3D horse geometry (box/capsule primitive for v1.0) accepting props `{ lane: PoLane }`; reads `positionInches` for world-Y position via react-spring interpolation; renders `goldGlowActive` emissive pulse via `MeshStandardMaterial.emissiveIntensity`; accepts `color: PoLaneColor` mapped to hex
- [X] T029 [P] [US1] Create `src/components/PoLedDisplay.tsx` — MSDF seven-segment text via `@react-three/drei` `<Text>`; accepts `value: string`; render at full static opacity for now (FR-002, FR-020); the canonical filament-flicker animation `[1, 0.15, 0.7, 0.3, 1.0]` over 180ms is defined and wired in T057 (Phase 5) — do NOT add a separate partial flicker here to avoid duplicating conflicting specs (M1 fix)
- [X] T030 [US1] Create `src/components/PoHorseWall.tsx` — flat vertical backdrop mesh; maps 8 `PoLane` records from `usePoLaneStore`; renders one `<PoHorse>` + one `<PoLedDisplay>` per lane; spaced evenly across wall width; positional layout driven by lane ID
- [X] T031 [US1] Implement race FSM transitions in `usePoRaceStore.ts` — `startCountdown()` sets `phase='Countdown'`, `countdownValue=3`; `tickCountdown()` decrements to 2, 1, then calls `startRace()`; wire `tickCountdown` to a `setInterval` of 1000ms started in `startCountdown()`; `startRace()` sets `phase='Racing'`, `countdownValue=null`
- [X] T032 [US1] Implement count-up stopwatch in `usePoRaceStore.ts` — `tickElapsed()` increments `elapsedSeconds` by 1; start a `setInterval(tickElapsed, 1000)` in `startRace()`; `finishRace(laneId)` clears interval, sets `phase='Finished'`, `winnerLaneId=laneId`; `resetRace()` clears all timers, resets `elapsedSeconds=0`, `phase='Idle'`
- [X] T033 [P] [US1] Implement lane update guards in `usePoLaneStore.ts` — `addScore` and `setPosition` MUST be no-ops for lanes where `isPlayerControlled=false`; `setGoldGlow` calls `usePoRaceStore.finishRace(laneId)` when `positionInches >= 60`
- [X] T034 [US1] Implement `resetAllLanes()` in `usePoLaneStore.ts` — store action sets `positionInches = 0`, `goldGlowActive = false`, `score = 0`, `rank = 0` synchronously for all lanes (C1 fix: React hooks such as `useSpring` MUST NOT be called inside Zustand store actions — hooks are only valid inside components/hooks); the visual "high-speed reverse slide" (FR-006) is produced by `PoHorse.tsx` which feeds `lane.positionInches` as a react-spring target with fast config `{ mass: 1, tension: 400, friction: 20 }` — the spring interpolates from the current rendered position to 0, creating the animated slide
- [X] T035 [US1] Create `src/components/PoCameraRig.tsx` **(implement T037 first — H3 fix)** — two camera modes: (1) fixed race cam at preset position looking down lane; (2) orbit win-sequence cam that lerps to orbit around winning horse when `phase='Finished'`; consumes `{ cameraRef, isOrbiting }` from `usePoOrbitCamera` (T037); uses `usePoRaceStore` to switch modes; Slow-In/Out easing via `useSpring({ config: { easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t } })`
- [X] T036 [P] [US1] Create `src/components/PoSummaryCard.tsx` — floating 3D plane rendered via `<Html>` (drei) when `phase='Finished'`; reads `PoSummaryStats` from `usePoRaceStore` + `usePoLaneStore` + `usePoBallStore`; displays Total Sprint Time (formatted mm:ss), Accuracy % (balls scored / balls thrown × 100), Avg Roll Speed mph (mean of all non-null `releaseSpeedMph` values)
- [X] T037 [US1] Create `src/hooks/usePoOrbitCamera.ts` — encapsulates orbit camera spring animation: `target` position lerps from fixed cam anchor to orbit radius around winner horse position; exposes `{ cameraRef, isOrbiting }` consumed by `PoCameraRig`
- [X] T038 [US1] Wire RESET action end-to-end: `PoDiegeticButton` RESET → `usePoRaceStore.resetRace()` → `usePoLaneStore.resetAllLanes()` → `usePoBallStore.resetAll()`; guard so RESET in Idle is a no-op
- [X] T039 [US1] Wire countdown LED in `PoHorseWall.tsx` — subscribe to `usePoRaceStore.countdownValue`; when non-null, override all `PoLedDisplay` values to show countdown digit; when null and `phase='Racing'`, show `elapsedSeconds` formatted as `M:SS`
- [X] T040 [US1] Integration test: full race cycle in `tests/integration/PoRaceLoop.test.tsx` — render `<PoMidway>` with Vitest + @testing-library/react; dispatch `startCountdown()`; advance fake timers through 3-2-1; call `addScore(1, 3)` 20 times; assert `phase='Finished'`, `winnerLaneId=1`, `elapsedSeconds > 0`, all lane 2–8 `positionInches === 0`

**Checkpoint**: User Story 1 is fully functional. App completes the entire race loop with no backend. Lanes 2–8 remain at zero throughout.

---

## Phase 4: User Story 2 — Physics-Driven Ball Rolling (Priority: P1)

**Goal**: Three Rapier-physics balls on a 10° incline; swipe-to-impulse input with weighted smoothing; five-hole scoring triangle; 3-ball economy; 3-second chute return; gold particle poof on score.

**Independent Test**: Load app; verify 3 balls in trough; soft swipe — ball falls short; aggressive swipe — ball overshoots; score a hole — ball disappears, `PoParticlePoof` emits gold particles, ball reappears via chute after 3s; all 3 balls in-flight — fourth swipe is blocked.

- [X] T041 [P] [US2] Create `src/components/PoInchMarker.tsx` — single low-profile box mesh (3mm height) rendered as `<instancedMesh>` of 60 instances in lane; each instance has a Rapier sensor collider; `onCollisionEnter` fires `PoAudioService.playRumble(speed)` with ball speed from contact data
- [X] T042 [P] [US2] Create `src/components/PoBall.tsx` — `<RigidBody type="dynamic">` + sphere collider (radius 0.8); `MeshStandardMaterial` with ivory-white base color and `roughnessMap` for scuff texture; reads `PoBall` id from props; exposes `rigidBodyRef` for impulse application from `usePoSwipeInput`
- [X] T043 [P] [US2] Create `src/components/PoScoringHole.tsx` — accepts `{ hole: PoScoringHole }`; renders hole aperture as torus + raised rim as `<CylinderGeometry>` ring; Rapier `<CuboidCollider sensor>` on hole opening; `onIntersectionEnter` → fires scoring callback prop; raised rim has `<CylinderCollider>` for ball deflection physics
- [X] T044 [US2] Create `src/components/PoTargetTriangle.tsx` — triangular board mesh; mounts 5 `<PoScoringHole>` instances in pyramid layout: 1 hole at apex (3 pts), 2 holes in middle row (2 pts each), 2 holes in base row (1 pt each); passes `onScore(holeId, points)` → `usePoLaneStore.addScore(1, points)` + `usePoBallStore.setPhase(ballId, 'Scoring')`
- [X] T045 [US2] Create `src/components/PoTrough.tsx` — curved container mesh at bottom of lane; renders up to 3 `<PoBall>` components for balls with `phase='InTrough'`; balls with other phases are rendered at their current physics position inside `<PoLane>`; spawn 3 balls on `PoSeedService.seedBalls()` at mount
- [X] T046 [US2] Create `src/hooks/usePoSwipeInput.ts` — `onPointerDown`: record start position + time; `onPointerMove`: update drag delta with weighted smoothing (blend factor 0.25 — new position linearly blended toward actual pointer, creating momentum lag); `onPointerUp`: compute impulse vector `{ x: deltaX * kScale, y: deltaY * kScale }`; record `releaseSpeedMph = poToMph(magnitude)`; call `usePoBallStore.setReleaseSpeed(activeBallId, mph)`; return `{ handlers, isAiming }`
- [X] T047 [US2] Create `src/hooks/usePoPhysicsSync.ts` — `useFrame` reads `usePoBallStore.getState()` for transient updates (no React re-render); Rapier `onContactForce` callbacks for each `PoBall` RigidBody are registered here and route impulse magnitude data to `PoAudioService`; guards no-op when `phase !== 'Racing'`
- [X] T048 [US2] Implement impulse application in `PoBall.tsx` — on `usePoSwipeInput` `onPointerUp`: apply `rigidBodyRef.current.applyImpulse(impulseVector)` to the active ball's Rapier RigidBody; impulse Y component drives it up the 10° incline; magnitude range calibrated so minimum detectable swipe ≈ 8 mph and maximum swipe ≈ 28 mph
- [X] T049 [US2] Implement 3-ball economy enforcement in `usePoBallStore.ts` — selector `canLaunch(): boolean` returns `true` only when at least 1 ball has `phase='InTrough'`; `usePoSwipeInput` must check `canLaunch()` on `onPointerDown` and abort if false; trough renders as visually empty when `canLaunch()=false`
- [X] T050 [US2] Implement return timer in `usePoBallStore.ts` — `setPhase(id, 'Scoring')` sets `returnTimerSeconds=3.0` and kicks off a `setInterval(tickReturn(id), 1000)`; `tickReturn` decrements by 1; at 0 calls `setPhase(id, 'Returning')` which clears interval and triggers chute re-entry; `setPhase(id, 'InTrough')` clears only `returnTimerSeconds` and updates `phase` — `releaseSpeedMph` on the ball record is NOT reset here because the speed was already appended to `sessionReleaseSpeedsMph` accumulator by `setReleaseSpeed()` (T018); the accumulator is the source of truth for Summary Card avg speed calc (M5 + H2 fix)
- [X] T051 [US2] Create `src/components/PoParticlePoof.tsx` — `useRef<THREE.InstancedMesh>()` with 40 gold sphere instances (radius 0.05); on mount seed each instance with random upward velocity `(0, rand(2, 5), 0)` world-space (not lane-incline-relative — FR-019); advance positions each `useFrame` tick via `mesh.setMatrixAt(i, matrix)` + `mesh.instanceMatrix.needsUpdate = true`; fade instance opacity 1→0 over 800ms via `useSpring` on a uniform value; `SelectiveBloom` eligible via `meshRef.current.layers.enable(1)` on mount; unmount via `useEffect` cleanup after `lifetimeMs` elapses (M2 fix: removed non-existent `useParticles` API — use `THREE.InstancedMesh` + `useFrame` directly)
- [X] T052 [US2] Wire `PoScoringHole.onIntersectionEnter` end-to-end: → `usePoBallStore.setPhase(ballId, 'Scoring')` → spawn `<PoParticlePoof>` at hole world position → `usePoLaneStore.addScore(1, holePoints)` → `PoAudioService.playRimClack(velocity)` → if `lane1.positionInches >= 60` then `usePoRaceStore.finishRace(1)`
- [X] T053 [US2] Implement inclined lane gravity in `PoScene.tsx` — configure `<Physics gravity={[0, -9.81 * Math.cos(10 * Math.PI/180), -9.81 * Math.sin(10 * Math.PI/180)]}>` to produce correct roll-back force down the 10° incline; natural gravity alone returns missed balls to trough without teleportation (FR-011)
- [X] T054 [US2] Integration test: 3-ball economy + return timing in `tests/integration/PoBallEconomy.test.tsx` — verify initial 3 balls all `phase='InTrough'`; launch all 3 (mock impulse); assert `canLaunch()=false`; advance fake timer 3s; assert at least 1 ball `phase='InTrough'` again; verify `releaseSpeedMph` recorded for each launched ball

**Checkpoint**: User Story 2 fully functional. All three ball interactions produce distinct outcomes. 3-ball economy correctly blocks over-limit launches. Scoring advances horse on Horse Wall.

---

## Phase 5: User Story 3 — Immersive 3D Midway Environment with Audio (Priority: P2)

**Goal**: Complete sensory experience: inclined playfield with 60 physical inch-marker ridges, raised scoring hole rims, eight color-coded horses on Horse Wall, vintage LED filament flicker, Selective Bloom on LEDs + particles, and fully procedural Tone.js audio.

**Independent Test**: Load app offline; verify portrait lock active; 8 distinct-color horses on Horse Wall; 5 holes in pyramid with visible raised rims; LED clocks flicker on digit change; roll a ball — hear rolling rumble proportional to speed; score — hear rim clack + see gold bloom; finish — hear winner's bell.

- [X] T055 [P] [US3] Create `src/components/PoLane.tsx` — `<BoxGeometry>` inclined plane rotated 10° pitch; mounts `<PoInchMarker>` `<instancedMesh>` of 60 ridges evenly spaced along lane length (one per inch, 0–59); lane has `<MeshStandardMaterial color="#5C4033">` (wood grain); left and right `<BoxGeometry>` guard rails; also renders `{balls.filter(b => b.phase !== 'InTrough').map(b => <PoBall key={b.id} ball={b} />)}` for all in-flight balls (M4 fix: `PoTrough` owns InTrough balls only; `PoLane` is the single spatial hierarchy mount point for in-flight/scoring/returning `PoBall` R3F components)
- [X] T056 [P] [US3] Implement Selective Bloom in `PoScene.tsx` — add `<SelectiveBloom luminanceThreshold={0.7} luminanceSmoothing={0.9} intensity={1.5}>` inside `<EffectComposer>`; bloom targets meshes on `layers.mask = 1` only; ensures playfield and horse geometric primitives do not bloom (FR-021)
- [X] T057 [P] [US3] Implement LED filament-flicker animation in `PoLedDisplay.tsx` — use `useSpring` from `@react-spring/three`; on `value` prop change trigger opacity sequence `[1, 0.15, 0.7, 0.3, 1.0]` over 180ms total with `immediate: false`; apply to `<animated.meshBasicMaterial opacity={springOpacity}>`
- [X] T058 [P] [US3] Implement horse color materials in `PoHorse.tsx` — `PoLaneColor` to hex map: `{ PoRed: '#CC2200', PoBlue: '#1155CC', PoYellow: '#DDAA00', PoGreen: '#228833', PoOrange: '#DD6600', PoPurple: '#7722AA', PoPink: '#DD44AA', PoWhite: '#EEEEEE' }`; `goldGlowActive=true` sets `emissive='#FFD700'` and `emissiveIntensity` spring from 0 → 2.5 in 400ms
- [X] T059 [P] [US3] Implement portrait lock in `PoOrientationGuard.tsx` — call `screen.orientation.lock('portrait').catch(() => { /* unsupported — CSS fallback active */ })` on first render; `window.addEventListener('orientationchange', ...)` updates overlay visibility; overlay `z-index: 9999` with backdrop filter blur
- [X] T060 [US3] Implement `PoAudioService.ts` fully — `init()`: instantiate `MembraneSynth` (rim clacks), `NoiseSynth` with low-pass filter (rolling rumble VCA), `MetalSynth` (winner's bell); each synth connected to `Tone.Destination`; `playRimClack(velocity)`: `membraneSynth.triggerAttackRelease(baseNote * (velocity/10), '16n')`; `playRumble(speed)`: `noiseSynth.set({ volume: -60 + speed * 2 })` + `noiseSynth.triggerAttack()`; `stopRumble()`: `noiseSynth.triggerRelease()`; `playWinnerBell()`: `metalSynth.triggerAttackRelease('C4', '2n')`; all methods guarded by `isInitialised` flag; PoLogger emits `{ service: 'PoAudioService', action: method, status: 'ok' }`
- [X] T061 [US3] Wire audio triggers in `usePoPhysicsSync.ts` — `onContactForce` for `PoInchMarker` colliders → `PoAudioService.playRumble(speed)` + `PoAudioService.stopRumble()` on contact end; `onContactForce` for `PoScoringHole` rim colliders → `PoAudioService.playRimClack(impulse.y)`
- [X] T062 [US3] Wire winner's bell — subscribe to `usePoRaceStore` in `PoScene.tsx` with `subscribeWithSelector(state => state.phase)`; when phase transitions to `'Finished'`, call `PoAudioService.playWinnerBell()`
- [X] T063 [US3] Add Selective Bloom layer bitmask to emissive meshes — in `PoHorse.tsx`: `mesh.layers.enable(1)` when `goldGlowActive=true`; in `PoLedDisplay.tsx`: `mesh.layers.enable(1)` on text mesh; in `PoParticlePoof.tsx`: `instancedMesh.layers.enable(1)` on mount
- [X] T064 [US3] Call `PoAudioService.init()` on first user gesture — add `onPointerDown` handler to `PoScene.tsx` root `<Canvas>` that calls `poAudioService.init()` once (guarded by `isInitialised` flag); satisfies Web Audio API autoplay policy

**Checkpoint**: User Story 3 fully functional. Full sensory Midway experience is present. Procedural audio plays on all three trigger events (roll, score, finish).

---

## Phase 6: User Story 4 — Diegetic In-World Menu Controls (Priority: P2)

**Goal**: Two 3D physical buttons (RESET and DIAG) rendered in-scene beside lane 1; both visually depress on press before firing their action.

**Independent Test**: Load app; tap RESET — button mesh depresses 2–4mm, countdown begins; tap DIAG — button mesh depresses, /diag route opens; Zustand race state persists across route change.

- [X] T065 [P] [US4] Create `src/components/PoDiegeticButton.tsx` — `<BoxGeometry>` button body + inset label plate; accepts `{ label: 'RESET' | 'DIAG'; onAction: () => void }`; `onPointerDown`: spring `positionZ` from 0 to -3mm over 80ms then calls `onAction()` on spring complete; `onPointerUp` / `onPointerLeave`: spring returns to 0; uses `useSpring` from `@react-spring/three`; NOT an HTML element — FR-026 compliance
- [X] T066 [US4] Mount two `<PoDiegeticButton>` instances in `PoScene.tsx` — RESET button at world position left of lane trough; DIAG button at world position right of lane trough; RESET `onAction` → `usePoRaceStore.resetRace()` + `usePoLaneStore.resetAllLanes()` + `usePoBallStore.resetAll()`; DIAG `onAction` → `useNavigate()('/diag')` from react-router-dom
- [X] T067 [US4] Guard RESET button behavior by phase — in RESET `onAction`: if `phase === 'Idle'` no-op; if `phase === 'Countdown'` or `'Racing'` or `'Finished'` proceed with full reset; add visual disabled state (reduced emissive) when `phase === 'Idle'`
- [X] T068 [US4] Verify that navigating to `/diag` via DIAG button does NOT clear Zustand stores — confirm `usePoRaceStore` state persists on `/diag` load by checking store `getState()` in `PoDiag` mount; add comment `// Zustand stores are module-level singletons — navigation does not reset them`

**Checkpoint**: User Story 4 fully functional. Both diegetic buttons depress visually and trigger correct actions. No HTML overlay buttons exist in the scene.

---

## Phase 7: User Story 5 — Diagnostics Vault (/diag) (Priority: P3)

**Goal**: `/diag` route shows a live JSON telemetry panel with FPS, geometry count, all 8 horse positions, race phase, elapsed time — with sensitive fields auto-masked.

**Independent Test**: Navigate to `/diag` while race is running; JSON updates every ~100ms; horse coordinate values change as race progresses; Session ID and User ID fields display masked (first + `***` + last); no network error shown when fully offline.

- [X] T069 [P] [US5] Implement `PoDiagService.ts` fully — `captureSnapshot()`: read `usePoRaceStore.getState()` and `usePoLaneStore.getState()` transient (no subscribe); build `PoDiagSnapshot` object; `poHorsePositions` = `lanes.map(l => l.positionInches)` (8 values); `poSessionId` and `poUserId` generated as deterministic short IDs (format `P` + 4 random chars + digit) and masked via `poMaskString()`; FPS from `performance.now()` delta between calls; `poGeometryCount` = R3F `gl.info.render.triangles` (passed in as parameter); PoLogger call
- [X] T070 [US5] Implement `PoDiag.tsx` fully — on mount: start `setInterval(() => setSnapshot(PoDiagService.captureSnapshot()), 100)` (10 Hz); on unmount: clear interval; render `<pre>{ JSON.stringify(snapshot, null, 2) }</pre>` in monospace font with Po-prefixed CSS class `po-diag-panel`; include Back link to `/` via `<Link>`
- [X] T071 [US5] Pass R3F renderer stats into `PoDiagService` — in `PoScene.tsx` use `useThree(state => state.gl.info)` and store `triangles` in a module-level ref readable by `PoDiagService.captureSnapshot(triangles)` without subscribing to React state
- [X] T072 [P] [US5] Unit test: `PoMaskString.test.ts` — test cases: `'P0X9K2' → 'P***2'`; `'AB' → 'A***B'`; `'A' → '***'`; `'Hello World' → 'H***d'`; all assertions must pass before T069 is considered complete (Constitution Principle V)
- [X] T073 [P] [US5] Unit test: `PoDiagService.test.ts` — mock `usePoRaceStore.getState()` and `usePoLaneStore.getState()`; call `captureSnapshot()`; assert `poHorsePositions.length === 8`; assert `poSessionId` matches pattern `/^.\*{3}.$/`; assert `poRacePhase` equals mocked value; validates against `diag-snapshot.schema.json`

**Checkpoint**: User Story 5 fully functional. Live telemetry updates in real-time. All sensitive fields are masked. Zero network requests.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Constitution compliance audits, performance validation, final clean-up.

- [X] T074 [P] Unit test: `PoAudioService.test.ts` — mock `Tone.MembraneSynth`, `Tone.NoiseSynth`, `Tone.MetalSynth`; call `init()`, `playRimClack(5)`, `playRumble(15)`, `stopRumble()`, `playWinnerBell()`; assert each Tone mock method called with correct arguments; assert no-op when `isInitialised=false`
- [X] T075 [P] Performance validation — in browser DevTools run race session; assert steady 60fps in `performance.measureUserAgentSpecificMemory()`; assert cold load < 3s on throttled CPU 4× slowdown; verify no garbage collection spikes from Zustand transient pattern
- [X] T076 [P] Production build validation — `npm run build` must complete with zero TypeScript errors and zero ESLint warnings; verify output `dist/` contains valid `index.html`, `assets/`, no source maps in production
- [X] T077 [P] Run `quickstart.md` 8-step smoke test against `npm run build` + `npm run preview` — execute all 8 manual steps in order; confirm COOP/COEP headers present in preview server; confirm full race loop completes; confirm `/diag` masking works
- [X] T078 [P] **Zero-Waste Audit** (Constitution Principle I): run `npm run lint` and fix all warnings; search for any unused imports with ESLint `noUnusedLocals`; delete any scaffolding files not referenced by any import; audit `package.json` for packages imported nowhere in `src/`
- [X] T079 [P] **Offline-Mode QA** (Constitution Principle II): open DevTools → Network → Offline; load app; complete full race from Idle to Finished; navigate to `/diag`; verify zero network requests in Network tab; verify no error banners are shown to the player
- [X] T080 [P] **GoF/SOLID Comment Review** (Constitution Principles III & IV): verify `PoAudioService.ts` has `// GoF Decorator` annotation; `PoSeedService.ts` and `PoDiagService.ts` have `// GoF Strategy` annotations; `usePoRaceStore.ts` subscriptions have `// GoF Observer` annotation; every `export` in `src/services/` and `src/hooks/` has a JSDoc comment on its public interface
- [X] T081 [P] **Observability Spot-Check** (Constitution Principle VI): verify `PoLogger.log(...)` is called in: `PoSeedService` (all 3 seed methods), `PoDiagService.captureSnapshot`, `PoAudioService` (all 5 methods); open DevTools Console in dev mode and confirm structured log objects are emitted with `{ timestamp, level, service, action, durationMs, status }` shape
- [X] T082 Final integration pass — render full app end-to-end: Idle → RESET (diegetic button) → Countdown (LED flicker) → Rolling (3 balls, audio) → Score (particle poof, horse advance, bloom) → Finish (orbit cam, Summary Card, winner's bell) → RESET → Idle; all SC-001 through SC-010 met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3) + US2 (Phase 4)**: Both P1 priority — begin after Phase 2; can run in parallel if staffed; US2 scoring wires into US1 horse advancement
- **US3 (Phase 5)**: Depends on US1 + US2 (environment wraps game logic already built)
- **US4 (Phase 6)**: Depends on US1 race FSM (RESET) + react-router (DIAG); can overlap US2/US3
- **US5 (Phase 7)**: Depends on US1 (race state) + US2 (horse positions) — can begin after Phase 2 in parallel
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

| Story | Blocking Dependency | Can Parallelize With |
|-------|--------------------|--------------------|
| US1 (P1) | Phase 2 complete | US2 (mostly separate files) |
| US2 (P1) | Phase 2 complete | US1 (mostly separate files) |
| US3 (P2) | US1 + US2 environment | US4 |
| US4 (P2) | US1 (FSM for RESET) | US3, US5 |
| US5 (P3) | Phase 2 (stores + services) | US3, US4 |

### Parallel Opportunities per Story

```
# US1 parallel tasks (different component files):
T028 PoHorse.tsx  ←─────┐
T029 PoLedDisplay.tsx   ├── All run in parallel
T033 usePoLaneStore     ┘
T036 PoSummaryCard.tsx ←── Independent of T030

# US2 parallel tasks:
T041 PoInchMarker.tsx ←─┐
T042 PoBall.tsx         ├── All run in parallel (separate components)
T043 PoScoringHole.tsx  ┘

# US3 parallel tasks:
T055 PoLane.tsx    ←────┐
T056 SelectiveBloom     ├── All run in parallel
T057 LED flicker        │
T058 Horse colors  ←────┘

# US5 parallel tasks:
T072 PoMaskString.test.ts ←─┐  Write and run before
T073 PoDiagService.test.ts  ┘  implementing T069–T071
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — **required before any story work**
3. Complete Phase 3: US1 (race loop, horses, camera, summary)
4. Complete Phase 4: US2 (physics, balls, scoring, audio triggers)
5. **STOP + VALIDATE**: run integration tests; smoke-test race loop offline
6. Deploy/demo — this is a fully playable v0 game

### Incremental Delivery

1. Setup + Foundational → Dev environment ready
2. US1 → Race loop functional with mock score trigger → MVP demo
3. US2 → Real ball physics and scoring → v0.1 demo
4. US3 → Full Midway sensory experience → v0.2
5. US4 → Diegetic controls (replace any temp HTML buttons) → v0.3
6. US5 → Diagnostics Vault → v1.0

---

## Task Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Phase 1: Setup | T001–T010 | 10 |
| Phase 2: Foundational | T011–T027b | 18 |
| Phase 3: US1 Race Session (P1) | T028–T040 | 13 |
| Phase 4: US2 Ball Physics (P1) | T041–T054 | 14 |
| Phase 5: US3 Environment + Audio (P2) | T055–T064 | 10 |
| Phase 6: US4 Diegetic Controls (P2) | T065–T068 | 4 |
| Phase 7: US5 Diagnostics Vault (P3) | T069–T073 | 5 |
| Phase 8: Polish | T074–T082 | 9 |
| **Total** | | **83** |

| Story | Task Count | Priority |
|-------|-----------|----------|
| US1 — Complete Race Session | 13 | P1 🎯 |
| US2 — Ball Physics | 14 | P1 |
| US3 — Environment + Audio | 10 | P2 |
| US4 — Diegetic Controls | 4 | P2 |
| US5 — Diagnostics Vault | 5 | P3 |
