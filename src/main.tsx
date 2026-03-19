import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { PoHome } from './pages/PoHome';
import { PoMidway } from './pages/PoMidway';
import { PoDiag } from './pages/PoDiag';
import { usePoRaceStore } from './store/usePoRaceStore';
import { usePoLaneStore } from './store/usePoLaneStore';
import { usePoBallStore } from './store/usePoBallStore';
import { usePoGameModeStore } from './store/usePoGameModeStore';
import { PoBallRegistry } from './utils/PoBallRegistry';

// ---------------------------------------------------------------------------
// DEV-only test bridge — exposes Zustand store state to Playwright e2e tests.
// Guarded by import.meta.env.DEV so it is tree-shaken in production builds.
// ---------------------------------------------------------------------------

if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__poTestBridge = {
    getRacePhase: () => usePoRaceStore.getState().phase,
    getElapsedSeconds: () => usePoRaceStore.getState().elapsedSeconds,
    getCountdownValue: () => usePoRaceStore.getState().countdownValue,
    getWinnerLaneId: () => usePoRaceStore.getState().winnerLaneId,
    getGameMode: () => usePoGameModeStore.getState().gameMode,
    getLanes: () => usePoLaneStore.getState().lanes,
    getBalls: () => usePoBallStore.getState().balls,
    // Fast-forward helpers for tests that don't need to click the 3D canvas
    triggerCountdown: () => usePoRaceStore.getState().startCountdown(),
    triggerFinish: (laneId: number) => usePoRaceStore.getState().finishRace(laneId),
    triggerReset: () => {
      usePoRaceStore.getState().resetRace();
      usePoLaneStore.getState().resetAllLanes();
      usePoBallStore.getState().resetAll();
    },
    /**
     * Simulate a ball launch: mark ball 0 as InFlight and record a release
     * speed. Mirrors what usePoSwipeInput does on pointer-up.
     * Returns false if phase !== 'Racing' or no ball is in trough.
     */
    triggerBallLaunch: (mph = 15, laneId = 1) => {
      if (usePoRaceStore.getState().phase !== 'Racing') return false;
      const { canLaunch, setPhase, setReleaseSpeed } = usePoBallStore.getState();
      if (!canLaunch(laneId)) return false;
      const ball = usePoBallStore.getState().balls.find(
        b => b.phase === 'InTrough' && b.laneId === laneId
      );
      if (!ball) return false;
      setReleaseSpeed(ball.id, mph);
      setPhase(ball.id, 'InFlight');
      return true;
    },
    /**
     * Returns the current Rapier world-space translation for every mounted
     * PoBall RigidBody. Available as soon as balls mount inside the Canvas.
     */
    getBallPhysicsPositions: () => {
      const activeBallIds = new Set(usePoBallStore.getState().balls.map(b => b.id));
      return PoBallRegistry.getPositions().filter(p => activeBallIds.has(p.id));
    },
    /**
     * Returns true once Rapier WASM has initialised and at least one
     * PoBall RigidBody has registered its position getter.  Tests that
     * depend on reliable setInterval timing should wait for this before
     * triggering store actions, otherwise heavy WASM init CPU load can
     * throttle JS timers and cause spurious failures.  For normal mode
     * (3 balls for lane 1) and demo mode (24 balls) we wait for >= 1.
     */
    // True only when a Rapier rigid body has its trough position (z ≈ 2.4).
    // Balls register immediately on mount but translation() returns {0,0,0}
    // until WASM finishes loading and the body is fully instantiated.
    isRapierReady: () => PoBallRegistry.getPositions().some(p => Math.abs(p.z) > 0.1),
  };
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<PoHome />} />
        <Route path="/game" element={<PoMidway />} />
        <Route path="/diag" element={<PoDiag />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
