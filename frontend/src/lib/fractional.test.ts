import { describe, expect, it } from 'vitest';
import { formatUnits, unitsForAmount } from './fractional';

describe('unitsForAmount', () => {
  it('buys a fraction of a share with a small amount', () => {
    // $50 at $188.37 a share
    expect(unitsForAmount(5000, 18837)).toBe(0.26543504);
    expect(formatUnits(unitsForAmount(5000, 18837))).toBe('0.26543504');
  });
  it('never buys more than was paid for', () => {
    const units = unitsForAmount(5000, 18837);
    expect(Math.round(units * 18837)).toBeLessThanOrEqual(5000);
  });
  it('handles whole shares and bad input', () => {
    expect(unitsForAmount(37674, 18837)).toBe(2);
    expect(formatUnits(2)).toBe('2');
    expect(unitsForAmount(0, 100)).toBe(0);
    expect(unitsForAmount(100, 0)).toBe(0);
  });
});
