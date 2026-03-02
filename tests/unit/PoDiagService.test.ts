/**
 * PoDiagService.test.ts — Unit tests for PoDiagService.captureSnapshot() (T073).
 *
 * Validates:
 *   - poHorsePositions array length === 8
 *   - poSessionId is masked (matches /^.\*{3}.$/)
 *   - poRacePhase equals the mocked store value
 *   - poElapsedSeconds equals the mocked store value
 *   - Snapshot shape satisfies required fields from diag-snapshot.schema.json
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PoRaceState } from '../../src/types/po-types';
import type { PoLane } from '../../src/types/po-types';

// ---------------------------------------------------------------------------
// Mock Zustand stores — return getState() without React context.
// ---------------------------------------------------------------------------

const mockRaceState: PoRaceState = {
  phase: 'Racing',
  elapsedSeconds: 42,
  countdownValue: null,
  winnerLaneId: null,
};

const mockLanes: PoLane[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  color: ['PoRed', 'PoBlue', 'PoYellow', 'PoGreen', 'PoOrange', 'PoPurple', 'PoPink', 'PoWhite'][i] as PoLane['color'],
  positionInches: i * 3,
  score: 0,
  rank: i + 1,
  isPlayerControlled: i === 0,
  goldGlowActive: false,
}));

vi.mock('../../src/store/usePoRaceStore', () => ({
  usePoRaceStore: {
    getState: vi.fn(() => mockRaceState),
  },
}));

vi.mock('../../src/store/usePoLaneStore', () => ({
  usePoLaneStore: {
    getState: vi.fn(() => ({ lanes: mockLanes, actions: {} })),
  },
}));

// Mock PoLogger so it doesn't emit in tests
vi.mock('../../src/utils/PoLogger', () => ({
  PoLogger: { log: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks are registered
// ---------------------------------------------------------------------------
// eslint-disable-next-line import/first
import { PoDiagService } from '../../src/services/PoDiagService';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PoDiagService.captureSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exactly 8 horse positions', () => {
    const snapshot = PoDiagService.captureSnapshot();
    expect(snapshot.poHorsePositions).toHaveLength(8);
  });

  it('each horse position has a laneId (1–8) and positionInches', () => {
    const snapshot = PoDiagService.captureSnapshot();
    snapshot.poHorsePositions.forEach((pos, idx) => {
      expect(pos.laneId).toBe(idx + 1);
      expect(typeof pos.positionInches).toBe('number');
    });
  });

  it('poSessionId is masked — matches /^.\\*{3}.$/', () => {
    const snapshot = PoDiagService.captureSnapshot();
    // Pattern from diag-snapshot.schema.json: one char + *** + one char
    expect(snapshot.poSessionId).toMatch(/^.\*{3}.$/);
  });

  it('poRacePhase equals the mocked race store value', () => {
    const snapshot = PoDiagService.captureSnapshot();
    expect(snapshot.poRacePhase).toBe('Racing');
  });

  it('poElapsedSeconds equals the mocked elapsed value', () => {
    const snapshot = PoDiagService.captureSnapshot();
    expect(snapshot.poElapsedSeconds).toBe(42);
  });

  it('satisfies required schema fields (poCapturedAt, poFps, poGeometryCount, poSessionId)', () => {
    const snapshot = PoDiagService.captureSnapshot();
    // Required fields per diag-snapshot.schema.json
    expect(typeof snapshot.poCapturedAt).toBe('string');
    expect(typeof snapshot.poFps).toBe('number');
    expect(snapshot.poFps).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.poGeometryCount).toBe('number');
    expect(snapshot.poGeometryCount).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.poSessionId).toBe('string');
  });

  it('poCapturedAt is a valid ISO 8601 date-time string', () => {
    const snapshot = PoDiagService.captureSnapshot();
    expect(() => new Date(snapshot.poCapturedAt)).not.toThrow();
    expect(new Date(snapshot.poCapturedAt).toISOString()).toBe(snapshot.poCapturedAt);
  });

  it('poUserId is null (no auth in v1.0)', () => {
    const snapshot = PoDiagService.captureSnapshot();
    expect(snapshot.poUserId).toBeNull();
  });
});
