/**
 * PoMidway.tsx — Main game page.
 *
 * Mounts the PoScene canvas and all in-world game components for Phase 3 + 4:
 *
 *   PoHorseWall     — 8-lane animated horse backdrop (T030/T039)
 *   PoLaneRamp      — 8 coloured inclined rolling lanes with holes (T041+)
 *   PoCameraRig     — orbit/race camera spring controller (T035)
 *   PoDiegeticButton RESET/DIAG — in-world buttons (T038)
 *   PoSummaryCard   — post-race floating results overlay (T036)
 *   PoTrough        — ball container + swipe input for lane 1 (T045)
 *   PoTargetTriangle — 5 scoring holes pyramid for lane 1 (T044/T052)
 *   PhysicsSyncMount — render-less; wires usePoPhysicsSync inside Physics (T047)
 */

import type { JSX } from 'react';
import { PoScene } from '../components/PoScene';
import { PoHorseWall } from '../components/PoHorseWall';
import { PoLaneRamp, RAMP_CENTER_Y, RAMP_CENTER_Z, RAMP_INCLINE } from '../components/PoLaneRamp';
import { PoCameraRig } from '../components/PoCameraRig';
import { PoDiegeticButton } from '../components/PoDiegeticButton';
import { PoSummaryCard } from '../components/PoSummaryCard';
import { PoTrough } from '../components/PoTrough';
import { PoTargetTriangle } from '../components/PoTargetTriangle';
import { PoLane } from '../components/PoLane';
import { PoHud } from '../components/PoHud';
import { usePoPhysicsSync } from '../hooks/usePoPhysicsSync';
import { usePoDemoAutoplay } from '../hooks/usePoDemoAutoplay';

import { PO_LANE_X_POSITIONS } from '../components/PoHorseWall';

// ---------------------------------------------------------------------------
// Render-less physics sync mount (must live inside <Physics> boundary)
// ---------------------------------------------------------------------------

function PhysicsSyncMount(): null {
  usePoPhysicsSync();
  return null;
}

// ---------------------------------------------------------------------------
// PoMidway
// ---------------------------------------------------------------------------

export function PoMidway(): JSX.Element {
  usePoDemoAutoplay();

  // FR-015: Render all 8 lanes with their geometric target triangles, 
  // ensuring the raised 3D rims appear uniformly across all lanes regardless of mode.
  const activeLaneIds = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div style={{ position: 'relative', width: '100dvw', height: '100dvh', overflow: 'hidden' }}>
      {/* HTML HUD overlay — always on top of the canvas */}
      <PoHud />
      <PoScene>
        {/* Physics sync hook (render-less, inside Physics boundary) */}
        <PhysicsSyncMount />

        {/* Horse race backdrop, LED clocks, and animated horses */}
        <PoHorseWall />

        {/* 8 coloured inclined ramps with 10 decorative holes each */}
        <PoLaneRamp />

        {/* Camera orbit animation rig (render-less) */}
        <PoCameraRig />

        {/* RESET button — start countdown (Idle) or reset race (Racing/Finished) */}
        <PoDiegeticButton label="RESET" position={[-1.2, -0.6, 4]} />

        {/* DIAG button — navigate to diagnostics screen */}
        <PoDiegeticButton label="DIAG" position={[1.2, -0.6, 4]} />

        {/* Post-race floating summary — visible only when phase === 'Finished' */}
        <PoSummaryCard />

        {activeLaneIds.map(laneId => {
          const laneX = PO_LANE_X_POSITIONS[laneId - 1];
          return (
            <group
              key={laneId}
              position={[laneX, RAMP_CENTER_Y, RAMP_CENTER_Z]}
              rotation={[RAMP_INCLINE, 0, 0]}
            >
              <PoTrough laneId={laneId} />
              <PoTargetTriangle laneId={laneId} />
              <PoLane />
            </group>
          );
        })}
      </PoScene>
    </div>
  );
}

