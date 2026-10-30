/** Money is always an integer in minor units (cents) plus an ISO currency code. */

export function exponent(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency: string, opts: { sign?: boolean } = {}): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    formatters.set(currency, f);
  }
  const text = f.format(minor / 10 ** exponent(currency));
  return opts.sign && minor > 0 ? `+${text}` : text;
}

/** "1,234.5" -> 123450 (USD). Returns null when the text is not a valid amount. */
export function parseMoney(text: string, currency: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.' || (cleaned.match(/\./g)?.length ?? 0) > 1) return null;
  const exp = exponent(currency);
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > exp) return null;
  const minor = Number(whole + frac.padEnd(exp, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units to an editable string ("1234.50"). */
export function toInputValue(minor: number, currency: string): string {
  return (minor / 10 ** exponent(currency)).toFixed(exponent(currency));
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD'];

/** Like parseMoney but keeps a leading minus (for balances that can be negative). */
export function parseSignedMoney(text: string, currency: string): number | null {
  const negative = text.trim().startsWith('-');
  const minor = parseMoney(text.replace('-', ''), currency);
  return minor === null ? null : negative ? -minor : minor;
}
