/** Money is always an integer in minor units (cents) plus an ISO currency code. */

export function exponent(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Rupees group as 12,34,567 (lakh and crore); every other currency follows the browser. */
const localeFor = (currency: string) => (currency === 'INR' ? 'en-IN' : undefined);

export function formatMoney(minor: number, currency: string, opts: { sign?: boolean } = {}): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency });
    formatters.set(currency, f);
  }
  const text = f.format(minor / 10 ** exponent(currency));
  return opts.sign && minor > 0 ? `+${text}` : text;
}

/** Short amounts for chart axes and tight spaces: 12.3L and 1.2Cr for rupees, 12.3K and 1.2M otherwise. */
export function formatCompact(minor: number, currency: string): string {
  const value = Math.abs(minor) / 10 ** exponent(currency);
  const sign = minor < 0 ? '-' : '';
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (currency === 'INR') {
    if (value >= 1e7) return `${sign}${trim(value / 1e7)}Cr`;
    if (value >= 1e5) return `${sign}${trim(value / 1e5)}L`;
    if (value >= 1e3) return `${sign}${trim(value / 1e3)}K`;
    return `${sign}${Math.round(value)}`;
  }
  return sign + new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
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
