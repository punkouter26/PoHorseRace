# Feature Specification: PoHorseRace — Roll-A-Ball Derby (Full Application)

**Feature Branch**: `001-arcade-derby`
**Created**: 2026-02-24
**Status**: Draft
**Input**: PoHorseRace Architectural Blueprint — complete application specification

## Clarifications

### Session 2026-02-24

- Q: How do NPC horses (lanes 2–8) score and advance in single-player mode? → A: Lanes 2–8 are static visual placeholders in v1.0 — they do not move, score, or simulate. Only the player's horse (lane 1) advances. Multiplayer support is deferred to a future release.
- Q: Does the race timer count up (stopwatch) or count down (deadline clock)? → A: Count-up stopwatch — the clock starts at 0:00 when the race begins and ticks upward until the player's horse crosses sixty inches. There is no time limit; the race ends only when the player wins.
- Q: Which lane and horse color belong to the player? → A: Lane 1 / Red horse always; no pre-race selection screen. The player's identity is fixed and immediate.
- Q: How does the viewport layout relate the playfield lane to the Horse Wall? → A: Single playfield view — one lane (lane 1) fills the screen end-to-end. The Horse Wall occupies the backdrop at the far end of the incline, directly behind the target triangle, so all eight horses are visible without a separate panel or overlay.
- Q: What does "Average Roll Speed" on the Summary Card measure, and in what unit? → A: The impulse magnitude at the moment of swipe release for each roll, averaged across all rolls in the session, displayed in mph (e.g., "Avg Speed: 14.2 mph").

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Complete Race Session (Priority: P1)

A player approaches the Midway, sees eight horses sitting at the start line, and
plays a full race from idle through countdown, active rolling, finish, and victory
sequence — then optionally resets for the next game.

**Why this priority**: This is the complete game loop and the only path to
demonstrating any value. Every other story is a sub-component of this journey.
Without a working end-to-end race, the application has no purpose.

**Independent Test**: Launch the app with no backend; press RESET to start
   countdown; roll all balls; verify the player's horse (lane 1) crosses the
   sixty-inch finish line while lanes 2–8 remain stationary; confirm orbit
   camera + summary card appear; press RESET and verify the player's horse
   slides back to zero.
**Acceptance Scenarios**:

1. **Given** the app is in Idle state, **When** the player presses the in-world
   RESET button, **Then** a 3-2-1 countdown appears on the top-wall LEDs with a
   filament-flicker animation and the race begins.
2. **Given** the race is Active (single-player mode), **When** the player's
   horse accumulates enough points to traverse sixty inches, **Then** that lane
   emits a constant gold glow, all ball input is disabled, and lanes 2–8 remain
   visually stationary throughout.
3. **Given** a winner has been declared, **When** the Victory sequence triggers,
   **Then** the camera transitions with Slow-In/Out easing into an orbit around
   the winning horse and a floating 3D Summary Card appears showing Total Sprint
   Time, Accuracy Percentage, and Average Roll Speed.
4. **Given** the app is in Finished state, **When** the player presses RESET,
   **Then** all horses perform a high-speed reverse slide back to zero and the
   app enters Idle state ready for the next race.
5. **Given** no backend server is running, **When** the application loads,
   **Then** the full Midway renders with all eight horses, all scoring mechanics
   work, and no error is surfaced to the player.

---

### User Story 2 — Physics-Driven Ball Rolling (Priority: P1)

A player picks up one of three available balls from the trough, aims left-to-right
with weighted smoothing, and releases it up the ten-degree incline toward the
scoring holes — experiencing genuine weight, momentum, and risk of over-shooting
or missing entirely.

**Why this priority**: The ball-rolling interaction is the primary control
mechanism. No gameplay is possible without accurate swipe-to-impulse physics and
the three-ball economy.

**Independent Test**: Load the app; verify three balls are present in the trough
at startup; perform a soft swipe — ball should fall short; perform an aggressive
swipe — ball should cross the target or bounce off back wall; score a hole — ball
should disappear then return via side chute after three seconds.

**Acceptance Scenarios**:

1. **Given** a ball is in the trough, **When** the player touches and drags the
   ball, **Then** the ball follows the pointer with a weighted delay, feeling
   heavy rather than snapping to the cursor.
2. **Given** a player releases a ball with a specific upward swipe velocity,
   **Then** the resulting impulse is proportional — a soft flick does not reach
   the target; an aggressive swipe may overshoot and bounce off the back wall.
3. **Given** a ball successfully enters a scoring hole, **Then** the ball
   disappears into a return chute, a gold particle "poof" floats upward
   (perpendicular to the viewport, defying the lane incline), the appropriate
   score is added, and the corresponding horse advances along the Horse Wall.
4. **Given** a ball enters a scoring hole, **When** exactly three seconds elapse,
   **Then** the ball physically rolls out of the side chute and back into the
   trough with a bounce animation.
5. **Given** all three balls are simultaneously in flight, **When** the player
   attempts another roll, **Then** no action occurs and the trough appears
   visually empty, forcing the player to wait for a return.
6. **Given** a ball rolls over an inch-marker ridge on the lane, **Then** a
   low-frequency rolling rumble sound is generated whose intensity scales with
   the ball's current speed.

---

### User Story 3 — Immersive 3D Midway Environment with Audio (Priority: P2)

A player experiences the full sensory fidelity of a carnival arcade machine:
seeing the lit-up 3D trough, the inclined playfield with sixty physical inch
markers, the triangular target board with raised metal rims, eight color-coded
horses on a vertical wall, and vintage LED segment displays — all accompanied by
procedural audio.

**Why this priority**: The environment and audio are what elevate this from a
score counter to a memorable experience. Without them the mechanics still work
(P1) but the product delivers no emotional value.

**Independent Test**: Load app in demo/offline mode; verify: eight color-coded
horses visible on Horse Wall; five scoring holes in pyramid formation visible on
target triangle; raised metal rims visible on each hole; at least two balls in
trough; LED displays showing race timer with flicker effect; procedural clack
plays when a ball strikes a rim; winner's bell plays on finish.

**Acceptance Scenarios**:

1. **Given** the app loads, **Then** the viewport is portrait-locked, black
   surround is applied, and the full lane (trough to Horse Wall) is visible
   simultaneously.
2. **Given** the scene renders, **Then** exactly five scoring holes are arranged
   in a pyramid (1 at peak = 3pts, 2 in middle = 2pts each, 2 at base = 1pt
   each) and each is bordered by a raised metal rim.
3. **Given** eight horses are rendered on the Horse Wall, **Then** each horse is
   procedurally generated in a distinct color (Red, Blue, Yellow, Green, Orange,
   Purple, Pink, White) and displays a vintage seven-segment LED rank indicator
   above it.
4. **Given** the race timer is active, **Then** the LED digit segments flicker
   during transitions, mimicking the warm-up delay of old arcade filament displays.
5. **Given** a ball strikes a scoring hole rim, **Then** a high-pitched clack
   sound is generated at volume and pitch proportional to the impact velocity.
6. **Given** a winner crosses the sixty-inch mark, **Then** a classic mechanical
   bell synth plays once and the winning lane pulses with a constant gold glow
   that persists until reset.
7. **Given** the app is in any state, **Then** the sixty inch-marker ridges on
   the playfield are individually visible as small three-dimensional protrusions
   running the length of the lane.

---

### User Story 4 — Diegetic In-World Menu Controls (Priority: P2)

A player interacts with large, physical 3D buttons (RESET and DIAG) floating
beside the lane rather than flat 2D UI overlays, receiving tactile visual
feedback when a button is pressed.

**Why this priority**: Diegetic controls are a core product differentiator and
a named design constraint. Using flat 2D buttons would break the immersion
specification.

**Independent Test**: Load app; click/tap RESET button — verify button visually
depresses into the board; verify countdown begins; click/tap DIAG button —
verify the Diagnostics Vault view opens.

**Acceptance Scenarios**:

1. **Given** the Midway is visible, **Then** two physical buttons labeled RESET
   and DIAG are rendered as 3D objects floating beside the player's lane — not
   as flat HTML overlay elements.
2. **Given** a player presses the RESET button, **Then** the button mesh
   physically depresses 2–4 mm into the board surface as visual confirmation
   before the action fires.
3. **Given** a player presses the DIAG button during any state, **Then** the
   view transitions to the Diagnostics Vault without disrupting the race state.
4. **Given** the RESET button is pressed during an active race, **Then** the
   race is cancelled, all horses perform the high-speed reverse slide, and the
   machine re-enters Idle state.

---

### User Story 5 — Diagnostics Vault (/diag) (Priority: P3)

A developer or technician navigates to the Diagnostics Vault to inspect the
live internal state of the game engine, including horse coordinates, frame rate,
geometry count, and masked sensitive identifiers.

**Why this priority**: Diagnostics are a named MVP requirement per the blueprint
but do not affect gameplay. They can be built and tested independently after the
core race loop is operational.

**Independent Test**: Navigate to /diag route while a race is running; verify
JSON telemetry updates in real-time; verify sensitive fields (Session ID, User
Identifier) have middle characters replaced with asterisks (e.g., P***2); verify
horse coordinate values change as race progresses.

**Acceptance Scenarios**:

1. **Given** a user navigates to /diag, **Then** a structured JSON telemetry
   panel is displayed showing: current FPS, active geometry count, and the
   current coordinate of every horse on the track.
2. **Given** the telemetry panel is visible, **When** horses are moving,
   **Then** horse coordinates in the JSON update in real-time without a page
   refresh.
3. **Given** the telemetry contains a Session ID or User Identifier value,
   **Then** the middle characters are masked with asterisks, leaving only the
   first and last characters visible (e.g., "P0X9K2" → "P***2").
4. **Given** a developer views the Diagnostics Vault while the app is offline
   (no backend), **Then** all client-side telemetry fields display correctly
   and no network-error state is shown.

---

### Edge Cases

- What happens when a ball is swipped with extreme velocity and overshoots all
  five scoring holes? → Ball hits the back wall and rolls back down the lane,
  remaining in play until it re-enters the trough area.
- What happens when all three balls are simultaneously in-flight and the race
  timer reaches zero (if a timeout mechanic is added)? → Race concludes with
  the current leader declared winner; in-flight balls cease scoring.
- What happens when two or more horses reach sixty inches simultaneously?
  → The first horse to cross within the simulation tick order wins; ties are
  broken by internal lane-order priority and a distinct visual indicator shows
  the second-place horse.
- What happens when the device orientation changes from portrait to landscape?
  → The viewport should locked to portrait; a rotation prompt ("Please rotate
  your device to portrait mode") is displayed if landscape is detected.
- What happens if the browser tab is backgrounded mid-race?
  → The physics simulation pauses; on foreground restore the race resumes from
  the paused state without time or position drift.
- What happens if the player swipes on the trough area when no balls are present?
  → The interaction is ignored; no physics event fires.
- What happens if the Diagnostics Vault is opened mid-race?
  → The race continues in the background; the Vault renders live telemetry
  without interrupting the simulation loop.

---

## Requirements *(mandatory)*

<!-- CONSTITUTION NOTE (Principle II): This application is offline-first by design.
     No API server is required for any game logic. The "mock layer" here is the
     initial game state seed (horse starting positions, default lane config) that
     initialises the client simulation. -->

### Functional Requirements

**Core Game Loop**

- **FR-001**: The application MUST support the following sequential states:
  Idle → Countdown → Racing → Finished → (back to Idle via Reset).
- **FR-002**: The Countdown state MUST display a 3-2-1 sequence exclusively on
  the top-wall LED displays, with filament-flicker animation on each digit.
- **FR-002b**: Once racing begins, the LED displays MUST switch to a count-up
  stopwatch starting at 0:00 and incrementing each second; there is no time
  limit — the race ends only when the player's horse reaches sixty inches.
- **FR-003**: The Racing state MUST process ball-to-hole collisions and translate
  each score into a proportional advancement of the player's horse (lane 1) on
  the Horse Wall. Lanes 2–8 MUST remain stationary in single-player mode and
  are reserved for future multiplayer expansion.
- **FR-004**: The Finished state MUST be triggered when any horse reaches the
  sixty-inch mark; the triggering horse's lane MUST emit a constant gold glow.
- **FR-005**: The application MUST display a floating 3D Summary Card in Finished
  state, showing: Total Sprint Time (the final stopwatch reading at the moment
  the player's horse crossed sixty inches), Accuracy Percentage (balls scored /
  balls thrown × 100), and Average Roll Speed (the mean impulse magnitude at
  swipe-release across all rolls in the session, displayed in mph).
- **FR-006**: The Reset action MUST cause all horses to perform a high-speed
  reverse slide animation back to zero before re-entering Idle state.

**Ball Physics & Three-Ball Economy**

- **FR-007**: The player MUST be limited to exactly three balls at all times;
  in-flight balls are not available for rolling until they return to the trough.
- **FR-008**: Ball aiming MUST use weighted smoothing — the ball follows pointer
  movement with momentum rather than snapping directly to the pointer position.
- **FR-009**: The release impulse MUST be calculated from the swipe distance and
  speed; a slow swipe MUST produce an impulse insufficient to reach the target
  triangle; an aggressive swipe MUST risk overshooting the scoring holes.
- **FR-010**: When a ball scores, it MUST disappear from the playfield and
  re-appear via a side chute into the trough after exactly three seconds.
- **FR-011**: When a ball fails to score (rolls past or back), it MUST return
  to the trough via the natural gravity of the inclined lane without teleportation.
- **FR-012**: The playfield lane MUST maintain a constant ten-degree incline
  that affects all ball physics including gravity, roll-back, and impulse decay.

**3D Environment**

- **FR-013**: The viewport MUST be portrait-locked and display a single continuous
  scene: the player's lane (trough at the bottom, inclined playfield, target
  triangle at the top) with the Horse Wall occupying the backdrop directly behind
  the target triangle at the far end of the incline. All eight horses MUST be
  simultaneously visible on the Horse Wall without a separate panel, split-screen,
  or overlay — the entire experience is one unified 3D view.
- **FR-014**: The Horse Wall MUST render eight distinct 3D horse primitives, each
  in a unique color: Red (lane 1 — player), Blue (lane 2), Yellow (lane 3),
  Green (lane 4), Orange (lane 5), Purple (lane 6), Pink (lane 7), White (lane 8).
  The player's horse is always lane 1 / Red; no color or lane selection screen
  exists in v1.0. Lanes 2–8 are rendered at position zero and MUST NOT move or
  score during a single-player race.
- **FR-015**: The target triangle MUST contain exactly five holes in a pyramid
  arrangement: one 3-point hole at the apex, two 2-point holes in the middle
  row, two 1-point holes in the base row.
- **FR-016**: Each scoring hole MUST have a raised metal rim that causes balls
  to circle or tetter on the edge before falling through or rolling back.
- **FR-017**: The playfield MUST display sixty individual inch-marker ridges as
  small 3D protrusions along its entire length.
- **FR-018**: Balls MUST have a visually distinct "Classic" ivory-white finish
  with minor scuff marks modeled on the surface.

**Scoring & Visual Effects**

- **FR-019**: When a ball enters a scoring hole, the system MUST emit gold-
  colored particles that float directly upward (perpendicular to the viewport)
  and fade as they rise — explicitly ignoring the lane's ten-degree incline.
- **FR-020**: LED segment displays above each horse MUST show the live race timer
  and current ranking with a filament-flicker effect on every digit change.
- **FR-021**: Particle effects and LED flicker MUST use the Po prefix namespace
  for all style and resource identifiers to ensure isolation from other contexts.

**Procedural Audio**

- **FR-022**: The application MUST generate all sounds procedurally at runtime
  (not via pre-recorded audio files) based on physical events.
- **FR-023**: Ball-to-rim impact sounds MUST be generated with pitch and volume
  proportional to the impact velocity.
- **FR-024**: Ball rolling over inch-marker ridges MUST generate a low-frequency
  rumble whose intensity scales with the ball's speed.
- **FR-025**: A classic mechanical bell synth MUST play once when any horse
  reaches the sixty-inch finish line.

**Diegetic Controls**

- **FR-026**: The RESET and DIAG controls MUST be rendered as 3D physical buttons
  within the scene geometry — not as flat 2D HTML overlay elements.
- **FR-027**: When a diegetic button is pressed, its mesh MUST animate to depress
  visually before the action is dispatched.

**Diagnostics Vault**

- **FR-028**: The application MUST expose a /diag route displaying a structured
  JSON telemetry panel with: FPS, active geometry count, and each horse's current
  position in inches.
- **FR-029**: The /diag panel MUST update the horse coordinates in real-time
  while a race is in progress.
- **FR-030**: Any field identified as a Session ID or User Identifier MUST have
  its middle characters masked before display (format: first char + asterisks +
  last char).

**Offline-First & Naming**

- **FR-031**: The client application MUST be fully functional with no backend
  server running — all physics, audio synthesis, race logic, and rendering MUST
  execute entirely within the user's browser, requiring no server round-trips.
- **FR-032**: The application MUST function as a standalone Midway machine; no
  network request MUST be required to start, play, or finish a race.
- **FR-033**: The solution name, root-level folder, application title, all CSS
  scope identifiers, and all diagnostic metric keys MUST carry the `Po` prefix
  (e.g., `PoHorseRace`, `PoLane`, `PoScoreHole`, `PoHorsePosX`).

---

### Key Entities

- **Race**: Represents a single game session. Attributes: state (Idle /
  Countdown / Racing / Finished), elapsedSeconds (count-up stopwatch; 0 until
  Racing begins, frozen at finish), winner lane ID.
- **Lane**: One of eight physical channels on the Horse Wall and playfield.
  Attributes: lane number (1–8), color name, current horse position in inches
  (0–60), current score, current rank, isPlayerControlled (boolean).
  In v1.0, only lane 1 (Red) has isPlayerControlled = true; lanes 2–8 are
  static placeholders with isPlayerControlled = false, position permanently
  at zero, reserved for future multiplayer.
- **Ball**: An active rolling ball. Attributes: position (x, y on the playfield),
  velocity vector, state (InTrough / InFlight / Scoring / Returning), time-to-
  return countdown, releaseSpeedMph (impulse magnitude at swipe-release,
  recorded once per roll for use in the Summary Card Average Roll Speed metric).
- **ScoringHole**: One of five target holes in the triangle. Attributes: point
  value (1 / 2 / 3), position on target board, rim collision state.
- **Horse**: Procedurally generated 3D primitive on the Horse Wall. Attributes:
  color, current position in inches, rank order, gold-glow active (boolean).
- **DiagSnapshot**: A point-in-time telemetry record. Attributes: timestamp,
  FPS, active geometry count, array of horse positions, masked session/user IDs.
- **InchMarker**: One of sixty physical ridges on the playfield. Attributes:
  position along lane length, collision trigger state for audio.
- **DiegeticButton**: A 3D in-world control. Attributes: label (RESET / DIAG),
  depress animation state, action bound.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player completes a full race cycle (Idle → Finished → Reset →
  Idle) in a single session with no application errors or visual glitches.
- **SC-002**: The application loads and renders the complete 3D Midway
  environment in under three seconds on a mid-tier device, with no backend
  server running.
- **SC-003**: All three ball-rolling interactions (under-power, accurate score,
  over-power overshoot) produce visually and audibly distinct outcomes, verified
  by a first-time user without instruction.
- **SC-004**: The three-ball economy prevents the player from holding more than
  three balls simultaneously in 100% of tested scenarios.
- **SC-005**: Gold particle effects appear on every successful score and are
  visible for at least one second in all five scoring holes.
- **SC-006**: Procedural audio plays for ball rolling, rim impact, and race
  finish in 100% of triggered events across all supported browsers.
- **SC-007**: The Diagnostics Vault /diag route updates horse coordinates with
  less than 500 ms latency relative to the in-game simulation during an active
  race.
- **SC-008**: Sensitive fields in the /diag telemetry panel are masked in 100%
  of renders — no full session or user identifier value is ever displayed in plain text.
- **SC-009**: The application renders correctly and remains fully operable in
  portrait orientation on screen heights from 667 px to 932 px (covering common
  mobile and tablet form factors).
- **SC-010**: The orbit camera Victory sequence and 3D Summary Card appear within
  two seconds of the sixty-inch finish being crossed, with smooth Slow-In/Out
  easing that is perceptibly non-linear.

---

## Assumptions

- The application targets modern evergreen browsers (Chrome, Firefox, Safari,
  Edge) supporting WebGL and the Web Audio API.
- "Offline-first" means no XHR / fetch call is required at runtime; the app may
  still use local browser APIs (localStorage, IndexedDB) for optional state
  persistence across sessions, if needed.
- The player uses touch input on mobile or mouse on desktop; both pointer types
  must support the swipe-to-impulse interaction.
- In v1.0, lane 1 (Red horse) is the player's lane; it is fixed and not
  selectable. Lanes 2–8 are static visual placeholders that do not move,
  score, or simulate. There are no NPC / AI opponents in single-player mode.
- Multiplayer support (assigning lanes 2–8 to remote or AI players) is
  explicitly out of scope for this feature and deferred to a future release.
- No user account, login, or persistent leaderboard is required for v1.0.
- The Po prefix convention applies to all code-level namespaces and identifiers
  but is not a user-visible product name on screen text (e.g., it is acceptable
  for the player-facing score display to say "Score" rather than "PoScore").
