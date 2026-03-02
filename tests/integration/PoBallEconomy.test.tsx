/**
 * PoBallEconomy.test.tsx — 3-ball economy + return timing integration test.
 * T054 [US2]
 *
 * Validates:
 *  1. Initial state: 3 balls all phase==='InTrough'
 *  2. canLaunch() returns true initially
 *  3. After launching all 3 (mock setPhase InFlight), canLaunch() === false
 *  4. After advancing fake timer 3s, at least 1 ball returns to InTrough
 *  5. releaseSpeedMph recorded in sessionReleaseSpeedsMph accumulator
 *  6. resetAll() clears accumulator + resets all balls to InTrough
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePoBallStore } from '../../src/store/usePoBallStore';

describe('PoBallEconomy — 3-ball economy + return timing (T054)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePoBallStore.getState().resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    usePoBallStore.getState().resetAll();
  });

  // ── 1. Initial state ──────────────────────────────────────────────────────

  it('initialises with 3 balls all InTrough', () => {
    const { balls } = usePoBallStore.getState();
    expect(balls).toHaveLength(3);
    balls.forEach(b => {
      expect(b.phase).toBe('InTrough');
      expect(b.releaseSpeedMph).toBeNull();
      expect(b.returnTimerSeconds).toBeNull();
    });
  });

  // ── 2. canLaunch true initially ───────────────────────────────────────────

  it('canLaunch() returns true when balls are in trough', () => {
    expect(usePoBallStore.getState().canLaunch()).toBe(true);
  });

  // ── 3. 3-ball economy blocks 4th launch ──────────────────────────────────

  it('canLaunch() returns false when all 3 balls are InFlight', () => {
    const { setPhase } = usePoBallStore.getState();
    setPhase(0, 'InFlight');
    setPhase(1, 'InFlight');
    setPhase(2, 'InFlight');

    expect(usePoBallStore.getState().canLaunch()).toBe(false);
  });

  // ── 4. Return timer: ball returns after Scoring + 3s ─────────────────────

  it('ball returns to InTrough after Scoring phase + 3-second timer', () => {
    const { setPhase } = usePoBallStore.getState();

    // Move ball 0 to Scoring (starts 3-second return timer)
    setPhase(0, 'Scoring');

    const ball0afterScore = usePoBallStore.getState().balls.find(b => b.id === 0)!;
    expect(ball0afterScore.phase).toBe('Scoring');
    expect(ball0afterScore.returnTimerSeconds).toBe(3);

    // Advance 3 ticks of 1 second each
    vi.advanceTimersByTime(3_000);

    // After timer, ball should be Returning or InTrough (500ms chute delay)
    const ball0afterTimer = usePoBallStore.getState().balls.find(b => b.id === 0)!;
    expect(['Returning', 'InTrough']).toContain(ball0afterTimer.phase);

    // Advance past the 500ms chute delay
    vi.advanceTimersByTime(600);

    const ball0final = usePoBallStore.getState().balls.find(b => b.id === 0)!;
    expect(ball0final.phase).toBe('InTrough');
  });

  // ── 5. releaseSpeedMph accumulator ───────────────────────────────────────

  it('setReleaseSpeed appends to sessionReleaseSpeedsMph accumulator', () => {
    const { setReleaseSpeed } = usePoBallStore.getState();

    setReleaseSpeed(0, 12.5);
    setReleaseSpeed(1, 18.3);

    const { sessionReleaseSpeedsMph } = usePoBallStore.getState();
    expect(sessionReleaseSpeedsMph).toHaveLength(2);
    expect(sessionReleaseSpeedsMph[0]).toBeCloseTo(12.5);
    expect(sessionReleaseSpeedsMph[1]).toBeCloseTo(18.3);
  });

  it('individual ball releaseSpeedMph is set via setReleaseSpeed', () => {
    const { setReleaseSpeed } = usePoBallStore.getState();
    setReleaseSpeed(0, 22.0);

    const ball0 = usePoBallStore.getState().balls.find(b => b.id === 0)!;
    expect(ball0.releaseSpeedMph).toBeCloseTo(22.0);
  });

  // ── 6. resetAll clears accumulator ───────────────────────────────────────

  it('resetAll() clears accumulator and resets all balls to InTrough', () => {
    const { setReleaseSpeed, setPhase, resetAll } = usePoBallStore.getState();

    setReleaseSpeed(0, 14.0);
    setPhase(0, 'InFlight');
    setPhase(1, 'Scoring');

    resetAll();

    const state = usePoBallStore.getState();
    expect(state.sessionReleaseSpeedsMph).toHaveLength(0);
    state.balls.forEach(b => expect(b.phase).toBe('InTrough'));
  });

  // ── 7. canLaunch recovers after a ball returns ────────────────────────────

  it('canLaunch() recovers to true after a scored ball returns to InTrough', () => {
    const { setPhase } = usePoBallStore.getState();

    // Launch all 3
    setPhase(0, 'InFlight');
    setPhase(1, 'InFlight');
    setPhase(2, 'InFlight');
    expect(usePoBallStore.getState().canLaunch()).toBe(false);

    // Score ball 0 — starts 3s return timer
    setPhase(0, 'Scoring');
    vi.advanceTimersByTime(3_600);

    expect(usePoBallStore.getState().canLaunch()).toBe(true);
  });
});
