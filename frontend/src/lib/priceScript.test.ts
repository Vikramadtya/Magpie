import { describe, expect, it } from 'vitest';
import type { Holding } from '../api/types';
import { buildPriceScript, parsePriceCsv } from './priceScript';

const holding = (symbol: string, currency: string, providerSymbol: string | null = null) =>
  ({ symbol, currency, providerSymbol }) as Holding;

describe('parsePriceCsv', () => {
  it('reads symbol, price and currency, skipping bad rows', () => {
    const rows = parsePriceCsv('symbol,price,currency\nTCS,3890.25,INR\nBAD,abc,USD\n"VTI",250.1,usd\n');
    expect(rows).toEqual([
      { symbol: 'TCS', price: 3890.25, currency: 'INR' },
      { symbol: 'VTI', price: 250.1, currency: 'USD' },
    ]);
  });

  it('returns nothing without the expected header', () => {
    expect(parsePriceCsv('a,b\n1,2')).toEqual([]);
  });
});

describe('buildPriceScript', () => {
  it('embeds each holding with Indian exchange suffixes for rupee symbols', () => {
    const script = buildPriceScript([holding('TCS', 'INR'), holding('VTI', 'USD', 'VTI')]);
    expect(script).toContain('TCS.NS');
    expect(script).toContain('TCS.BO');
    expect(script).toContain('prices.csv');
  });

  it('looks funds up by scheme code', () => {
    const script = buildPriceScript([holding('MF:122639', 'INR', 'MF:122639')]);
    expect(script).toContain('MF:122639');
    expect(script).not.toContain('MF:122639.NS');
  });
});
