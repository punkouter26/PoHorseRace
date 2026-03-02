/**
 * PoLeaderboard.test.ts — Tests for poCalcRanks (tie-break, all-zero, sequential).
 */
import { describe, it, expect } from 'vitest';
import { poCalcRanks } from '../../src/utils/PoLeaderboard';
import type { PoLane } from '../../src/types/po-types';

/** Build a minimal PoLane stub for testing. */
function lane(id: number, positionInches: number): PoLane {
  return {
    id,
    color: 'PoRed',
    positionInches,
    score: 0,
    rank: 0,
    isPlayerControlled: id === 1,
    goldGlowActive: false,
  };
}

describe('poCalcRanks', () => {
  it('returns sequential ranks for distinct positions', () => {
    const lanes = [lane(1, 60), lane(2, 40), lane(3, 20), lane(4, 5)];
    const ranks = poCalcRanks(lanes);
    expect(ranks.get(1)).toBe(1);
    expect(ranks.get(2)).toBe(2);
    expect(ranks.get(3)).toBe(3);
    expect(ranks.get(4)).toBe(4);
  });

  it('assigns same rank to tied positions (standard competition ranking)', () => {
    // lanes 1 and 2 tied at 60; lane 3 at 40
    const lanes = [lane(1, 60), lane(2, 60), lane(3, 40)];
    const ranks = poCalcRanks(lanes);
    expect(ranks.get(1)).toBe(1);
    expect(ranks.get(2)).toBe(1);
    expect(ranks.get(3)).toBe(3); // skips rank 2 — standard competition ranking
  });

  it('assigns rank 1 to all lanes when all are at 0 (start state)', () => {
    const lanes = Array.from({ length: 8 }, (_, i) => lane(i + 1, 0));
    const ranks = poCalcRanks(lanes);
    // All tied at 0 → all rank 1
    for (let id = 1; id <= 8; id++) {
      expect(ranks.get(id)).toBe(1);
    }
  });

  it('handles a single lane', () => {
    const ranks = poCalcRanks([lane(1, 50)]);
    expect(ranks.get(1)).toBe(1);
  });

  it('handles input lanes in any order', () => {
    // Shuffled input; lane 3 should still be rank 1 (highest pos)
    const lanes = [lane(2, 20), lane(3, 55), lane(1, 30)];
    const ranks = poCalcRanks(lanes);
    expect(ranks.get(3)).toBe(1);
    expect(ranks.get(1)).toBe(2);
    expect(ranks.get(2)).toBe(3);
  });

  it('three-way tie in the middle with others ranked around', () => {
    const lanes = [
      lane(1, 60), lane(2, 30), lane(3, 30), lane(4, 30), lane(5, 10),
    ];
    const ranks = poCalcRanks(lanes);
    expect(ranks.get(1)).toBe(1);
    expect(ranks.get(2)).toBe(2);
    expect(ranks.get(3)).toBe(2);
    expect(ranks.get(4)).toBe(2);
    expect(ranks.get(5)).toBe(5); // skips 3 and 4
  });
});
