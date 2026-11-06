import { describe, expect, it } from 'vitest';
import { formatCompact, formatMoney, parseMoney, parseSignedMoney, toInputValue } from './money';

describe('money', () => {
  it('parses amounts into minor units', () => {
    expect(parseMoney('12.5', 'USD')).toBe(1250);
    expect(parseMoney('1,234.56', 'USD')).toBe(123456);
    expect(parseMoney('500', 'JPY')).toBe(500);
  });
  it('rejects too many decimals and junk', () => {
    expect(parseMoney('1.234', 'USD')).toBeNull();
    expect(parseMoney('1.5', 'JPY')).toBeNull();
    expect(parseMoney('', 'USD')).toBeNull();
    expect(parseMoney('1.2.3', 'USD')).toBeNull();
  });
  it('keeps the sign when asked', () => {
    expect(parseSignedMoney('-50', 'USD')).toBe(-5000);
    expect(parseSignedMoney('50', 'USD')).toBe(5000);
  });
  it('round-trips through the input value', () => {
    expect(toInputValue(123450, 'USD')).toBe('1234.50');
    expect(parseMoney(toInputValue(99, 'USD'), 'USD')).toBe(99);
  });
  it('groups rupees as lakh and crore', () => {
    expect(formatMoney(1234567850, 'INR')).toBe('₹1,23,45,678.50');
  });
  it('shortens amounts for charts', () => {
    expect(formatCompact(123456700, 'INR')).toBe('12.3L');
    expect(formatCompact(2500000000, 'INR')).toBe('2.5Cr');
    expect(formatCompact(450000, 'INR')).toBe('4.5K');
    expect(formatCompact(-250000, 'INR')).toBe('-2.5K');
    expect(formatCompact(123456700, 'USD')).toBe('1.2M');
  });
  it('formats with the currency', () => {
    expect(formatMoney(1250, 'USD')).toContain('12.50');
    expect(formatMoney(1200, 'USD')).not.toContain('.00');
    expect(formatMoney(1800000, 'INR')).toBe('₹18,000');
  });
});
