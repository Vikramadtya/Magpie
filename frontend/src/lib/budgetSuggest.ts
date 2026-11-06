import { exponent } from './money';

/** A round, friendly limit just above what you usually spend. */
export function suggestLimit(averageMinor: number, currency: string): number {
  const exp = exponent(currency);
  const major = averageMinor / 10 ** exp;
  if (major <= 0) return 0;
  const unit = major >= 100000 ? 5000 : major >= 10000 ? 1000 : major >= 1000 ? 100 : major >= 100 ? 10 : 1;
  return Math.ceil(major / unit) * unit * 10 ** exp;
}

