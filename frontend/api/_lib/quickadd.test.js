import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authenticate, handleChoices, handleSubmit, parseAmount } from './quickadd.js';

const UID = '11111111-1111-4111-8111-111111111111';
const WS = '22222222-2222-4222-8222-222222222222';
const ACC = '33333333-3333-4333-8333-333333333333';
const ACC2 = '44444444-4444-4444-8444-444444444444';
const KEY = `qak_${'a'.repeat(43)}`;
const now = () => new Date('2026-11-02T10:00:00Z');

/** A stand-in for the database: answers each query by matching a fragment of its text. */
function fakeSql(routes) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ');
    calls.push({ text, values });
    for (const [pattern, rows] of routes) {
      if (pattern.test(text)) return rows;
    }
    return [];
  };
  sql.calls = calls;
  return sql;
}

function response() {
  const res = { headers: {}, statusCode: 200, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (n) => { res.statusCode = n; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

const req = (body, key = KEY, method = 'POST') => ({ method, headers: key ? { authorization: `Bearer ${key}` } : {}, body });

const keyRow = [/FROM quick_api_keys k JOIN workspace_members/, [{ kid: 'k1', uid: UID, ws: WS }]];
const accounts = [/FROM accounts WHERE workspace_id = \? AND NOT is_archived AND NOT memo$/, [
  { id: ACC, name: 'HDFC Card', currency: 'INR' },
  { id: ACC2, name: 'Cash', currency: 'USD' },
]];
const load = [/FROM quick_captures WHERE user_id/, [{ pending: 0, recent: 0 }]];
const base = [keyRow, accounts, load];
const inserted = (sql) => sql.calls.find((c) => /INSERT INTO quick_captures/.test(c.text));

async function submit(body, routes = base, key = KEY) {
  const sql = fakeSql(routes);
  const res = response();
  await handleSubmit(req(body, key), res, { sql, now });
  return { res, sql };
}

describe('parseAmount', () => {
  it('reads decimal text or numbers in the currency of the account', () => {
    expect(parseAmount('1,234.50', 'USD')).toBe(123450);
    expect(parseAmount(450, 'JPY')).toBe(450);
    expect(parseAmount(12.5, 'INR')).toBe(1250);
    expect(parseAmount('12.345', 'KWD')).toBe(12345);
  });
  it('rejects empty, zero, too precise and non-numeric amounts', () => {
    for (const bad of ['', '0', 'abc', '1.234', '1.2.3', '9'.repeat(20), undefined]) expect(parseAmount(bad, 'USD')).toBeNull();
  });
});

describe('authenticate', () => {
  it('looks the key up by its hash, never by the key itself', async () => {
    const sql = fakeSql([keyRow]);
    expect(await authenticate(sql, req(null))).toMatchObject({ uid: UID, ws: WS });
    const lookup = sql.calls[0];
    expect(lookup.values).toEqual([createHash('sha256').update(KEY).digest('hex')]);
    expect(JSON.stringify(sql.calls)).not.toContain(KEY);
    expect(sql.calls[1].text).toMatch(/UPDATE quick_api_keys SET last_used_at/);
  });

  it('rejects missing, malformed and unknown keys without touching anything', async () => {
    expect(await authenticate(fakeSql([keyRow]), req(null, ''))).toBeNull();
    expect(await authenticate(fakeSql([keyRow]), { headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(await authenticate(fakeSql([keyRow]), req(null, 'ksk_wrongkind'))).toBeNull();
    expect(await authenticate(fakeSql([keyRow]), req(null, `qak_${'x'.repeat(200)}`))).toBeNull();
    const none = fakeSql([]);
    expect(await authenticate(none, req(null))).toBeNull();
    expect(none.calls).toHaveLength(1); // no last-used update for an unknown key
  });
});

describe('choices', () => {
  it('returns accounts and categories for the key, and refuses a bad key', async () => {
    const listed = [/NOT memo ORDER BY name/, [{ id: ACC, name: 'HDFC Card', type: 'CREDIT_CARD', currency: 'INR' }]];
    const sql = fakeSql([keyRow, listed, [/FROM categories/, [{ id: 'c1', name: 'Food', kind: 'EXPENSE', parentId: null }]]]);
    const res = response();
    await handleChoices(req(null, KEY, 'GET'), res, { sql });
    expect(res.statusCode).toBe(200);
    expect(res.body.accounts[0].name).toBe('HDFC Card');
    const denied = response();
    await handleChoices(req(null, 'qak_nope', 'GET'), denied, { sql: fakeSql([]) });
    expect(denied.statusCode).toBe(401);
  });
});

describe('submit', () => {
  const entry = { amount: '450.50', account: 'hdfc card', payee: ' Swiggy ', note: 'lunch', occurredOn: '2026-11-02', key: 'abcd-1234-efgh' };

  it('stores the entry under the key owner, in the account currency, matching the account by name', async () => {
    const { res, sql } = await submit(entry);
    expect(res.statusCode).toBe(200);
    expect(inserted(sql).values.slice(0, 7)).toEqual([WS, UID, 'EXPENSE', 45050, 'INR', '2026-11-02', ACC]);
    expect(inserted(sql).values).toContain('Swiggy');
  });

  it('accepts an account id and a numeric amount', async () => {
    const { res, sql } = await submit({ amount: 99, accountId: ACC2, type: 'income' });
    expect(res.statusCode).toBe(200);
    expect(inserted(sql).values.slice(2, 7)).toEqual(['INCOME', 9900, 'USD', '2026-11-02', ACC2]);
  });

  it('ignores a user or workspace sent in the body', async () => {
    const { sql } = await submit({ ...entry, userId: 'x', workspaceId: 'y', user_id: 'z', ws: 'w' });
    expect(inserted(sql).values.slice(0, 2)).toEqual([WS, UID]);
  });

  it('files an unknown category name in the note instead of losing the entry', async () => {
    const { res, sql } = await submit({ ...entry, category: 'Fod' });
    expect(res.statusCode).toBe(200);
    expect(inserted(sql).values).toContain('lunch · Category: Fod');
  });

  it('uses a category found by name, preferring a top-level one', async () => {
    const found = [/FROM categories WHERE workspace_id = \? AND NOT is_archived AND kind/, [{ id: 'child', parentId: 'p' }, { id: 'top', parentId: null }]];
    const { sql } = await submit({ ...entry, category: 'Food' }, [...base, found]);
    expect(inserted(sql).values[7]).toBe('top');
  });

  it('tells the caller which accounts exist when the account is unknown, ambiguous or missing', async () => {
    const unknown = await submit({ ...entry, account: 'Nope' });
    expect(unknown.res.statusCode).toBe(400);
    expect(unknown.res.body).toMatchObject({ error: 'unknown_account', accounts: ['HDFC Card', 'Cash'] });
    const missing = await submit({ amount: '5' });
    expect(missing.res.body.error).toBe('account_required');
    expect(inserted(missing.sql)).toBeUndefined();
  });

  it('uses the only account when there is just one', async () => {
    const one = [/FROM accounts WHERE workspace_id = \? AND NOT is_archived AND NOT memo$/, [{ id: ACC, name: 'Only', currency: 'USD' }]];
    const { res } = await submit({ amount: '5' }, [keyRow, one, load]);
    expect(res.statusCode).toBe(200);
  });

  it('rejects bad input without touching the queue', async () => {
    const bad = [{ ...entry, amount: 'abc' }, { ...entry, type: 'TRANSFER' }, { ...entry, key: 'x' }, { ...entry, accountId: 'nope' }, { ...entry, occurredOn: '2031-01-01' }];
    for (const b of bad) {
      const { res, sql } = await submit(b);
      expect(res.statusCode).toBe(400);
      expect(inserted(sql)).toBeUndefined();
    }
  });

  it('refuses a missing, revoked or unknown key', async () => {
    for (const key of ['', 'qak_unknown']) {
      const { res, sql } = await submit(entry, [], key);
      expect(res.statusCode).toBe(401);
      expect(inserted(sql)).toBeUndefined();
    }
  });

  it('only accepts POST', async () => {
    const res = response();
    await handleSubmit(req(null, KEY, 'GET'), res, { sql: fakeSql(base), now });
    expect(res.statusCode).toBe(405);
  });

  it('stops a flood: too many in a minute, or too many waiting', async () => {
    for (const row of [{ pending: 0, recent: 20 }, { pending: 200, recent: 0 }]) {
      const { res, sql } = await submit(entry, [keyRow, accounts, [/FROM quick_captures WHERE user_id/, [row]]]);
      expect(res.statusCode).toBe(429);
      expect(inserted(sql)).toBeUndefined();
    }
  });

  it('gives callers without their own key a repeatable one, so a double tap is stored once', async () => {
    const { key, ...withoutKey } = entry;
    const a = inserted((await submit(withoutKey)).sql).values.at(-1);
    const b = inserted((await submit(withoutKey)).sql).values.at(-1);
    const other = inserted((await submit({ ...withoutKey, amount: '451' })).sql).values.at(-1);
    expect(a).toMatch(/^auto-/);
    expect(a).toBe(b);
    expect(other).not.toBe(a);
    expect(key).toBeDefined();
  });
});
