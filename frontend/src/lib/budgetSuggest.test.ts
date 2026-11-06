import { describe, expect, it } from 'vitest';
import { suggestLimit } from './budgetSuggest';

describe('suggestLimit', () => {
  it('rounds up to a friendly number just above what you usually spend', () => {
    expect(suggestLimit(1234_00, 'INR')).toBe(1300_00);
    expect(suggestLimit(8765_00, 'INR')).toBe(8800_00);
    expect(suggestLimit(45678_00, 'INR')).toBe(46000_00);
    expect(suggestLimit(250_000_00, 'INR')).toBe(250_000_00);
    expect(suggestLimit(42_00, 'USD')).toBe(42_00);
  });
  it('suggests nothing when there is no spending', () => {
    expect(suggestLimit(0, 'INR')).toBe(0);
    expect(suggestLimit(-5, 'INR')).toBe(0);
  });
  it('respects currencies without decimals', () => {
    expect(suggestLimit(12345, 'JPY')).toBe(13000);
  });
});
