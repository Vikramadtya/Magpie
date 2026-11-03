import { describe, expect, it } from 'vitest';
import { countActive, parseFilters, readSaved, toParams, toQuery, writeSaved } from './txFilters';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('filters in the address', () => {
  it('round-trips every filter', () => {
    const f = parseFilters(new URLSearchParams(`q=coffee&account=${A},${B}&category=${A}&payee=${B}&tag=${A}&none=1&min=500&max=1200.50&from=2026-11-01&to=2026-11-30&type=EXPENSE&trip=${A}&by=me&sort=amount_desc`));
    expect(f).toMatchObject({ q: 'coffee', accountIds: [A, B], categoryIds: [A], payeeIds: [B], tagIds: [A], uncategorised: true, minAmount: '500', maxAmount: '1200.50', type: 'EXPENSE', sort: 'amount_desc', spentBy: 'me' });
    expect(parseFilters(toParams(f))).toEqual(f);
  });

  it('ignores unknown sorts and types and leaves the default sort out of the address', () => {
    expect(parseFilters(new URLSearchParams('sort=sideways&type=NOPE')).sort).toBeUndefined();
    expect(parseFilters(new URLSearchParams('type=NOPE')).type).toBeUndefined();
    expect(toParams({ sort: 'date_desc' }).toString()).toBe('');
  });

  it('still reads the links other pages already use', () => {
    expect(parseFilters(new URLSearchParams(`account=${A}`)).accountIds).toEqual([A]);
    expect(parseFilters(new URLSearchParams(`category=${A}&from=2026-10-01&to=2026-10-31`))).toMatchObject({ categoryIds: [A], from: '2026-10-01' });
  });
});

describe('server query', () => {
  it('sends ids joined, amounts in minor units, and nothing for empty filters', () => {
    const q = toQuery({ accountIds: [A, B], minAmount: '500', maxAmount: '12.5' }, 'INR');
    expect(q).toMatchObject({ accountIds: `${A},${B}`, minAmount: 50000, maxAmount: 1250 });
    const empty = toQuery({}, 'INR');
    expect(Object.values(empty).every((v) => v === undefined)).toBe(true);
  });

  it('uses the currency\'s own minor units', () => {
    expect(toQuery({ minAmount: '500' }, 'JPY').minAmount).toBe(500);
  });
});

describe('counting and saving', () => {
  it('counts each kind of filter once', () => {
    expect(countActive({})).toBe(0);
    expect(countActive({ q: 'x', accountIds: [A, B], from: '2026-11-01', to: '2026-11-30', minAmount: '1', maxAmount: '2' })).toBe(4);
  });

  it('keeps saved filters per workspace and survives bad data', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    writeSaved('ws1', [{ id: '1', name: 'Food', query: 'category=x' }], store);
    expect(readSaved('ws1', store)).toHaveLength(1);
    expect(readSaved('ws2', store)).toEqual([]);
    expect(readSaved('ws1', { getItem: () => '{broken' })).toEqual([]);
  });
});
