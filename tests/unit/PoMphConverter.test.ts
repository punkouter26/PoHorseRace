/**
 * PoMphConverter.test.ts — Round-trip accuracy tests for mph ↔ impulse conversion.
 */
import { describe, it, expect } from 'vitest';
import { poToMph, poFromMph } from '../../src/utils/PoMphConverter';

describe('poToMph', () => {
  it('converts 0 impulse to 0 mph', () => {
    expect(poToMph(0)).toBe(0);
  });

  it('converts a known impulse to expected mph (calibration check)', () => {
    // 1 m/s = 2.23694 mph; impulse units = m/s for 1 kg ball
    expect(poToMph(1)).toBeCloseTo(2.23694, 3);
  });

  it('max swipe impulse (~12.5 units) maps to approximately 28 mph', () => {
    const mph = poToMph(12.5);
    expect(mph).toBeGreaterThan(25);
    expect(mph).toBeLessThan(30);
  });
});

describe('poFromMph', () => {
  it('converts 0 mph to 0 impulse units', () => {
    expect(poFromMph(0)).toBe(0);
  });

  it('converts 28 mph to the expected impulse range', () => {
    const impulse = poFromMph(28);
    expect(impulse).toBeGreaterThan(12);
    expect(impulse).toBeLessThan(14);
  });
});

describe('round-trip accuracy', () => {
  it('toMph → fromMph returns original value within floating-point tolerance', () => {
    const original = 15.7;
    const roundTrip = poFromMph(poToMph(original));
    expect(roundTrip).toBeCloseTo(original, 8);
  });

  it('fromMph → toMph returns original mph within tolerance', () => {
    const originalMph = 20.5;
    const roundTrip = poToMph(poFromMph(originalMph));
    expect(roundTrip).toBeCloseTo(originalMph, 8);
  });
});
