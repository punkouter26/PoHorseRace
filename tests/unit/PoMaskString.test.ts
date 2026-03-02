/**
 * PoMaskString.test.ts — Unit tests for poMaskString utility (T013 contract).
 */
import { describe, it, expect } from 'vitest';
import { poMaskString } from '../../src/utils/PoMaskString';

describe('poMaskString', () => {
  it('returns "***" for empty string', () => {
    expect(poMaskString('')).toBe('***');
  });

  it('returns "***" for single-character string', () => {
    expect(poMaskString('A')).toBe('***');
  });

  it('returns first + "***" + last for two-character string', () => {
    expect(poMaskString('AB')).toBe('A***B');
  });

  it('returns first + "***" + last for three-character string', () => {
    expect(poMaskString('ABC')).toBe('A***C');
  });

  // T072 explicit contract cases
  it('T072: \'P0X9K2\' → \'P***2\'', () => {
    expect(poMaskString('P0X9K2')).toBe('P***2');
  });

  it('T072: \'A\' → \'***\'', () => {
    expect(poMaskString('A')).toBe('***');
  });

  it('T072: \'Hello World\' → \'H***d\'', () => {
    expect(poMaskString('Hello World')).toBe('H***d');
  });

  it('masks middle chars for longer strings', () => {
    expect(poMaskString('P0X9K2')).toBe('P***2');
  });

  it('masks a typical session ID', () => {
    const result = poMaskString('SESSION123');
    expect(result).toMatch(/^S\*\*\*3$/);
  });

  it('preserves exactly first and last characters only', () => {
    const input = 'HelloWorld';
    const result = poMaskString(input);
    expect(result[0]).toBe('H');
    expect(result[result.length - 1]).toBe('d');
    expect(result).toContain('***');
    expect(result.length).toBe(5); // H + *** + d
  });
});
