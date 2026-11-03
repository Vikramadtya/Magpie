import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handleInteraction, respondToDiscord, verifyDiscordSignature } from './discord.js';

const UID = '11111111-1111-4111-8111-111111111111';
const WS = '22222222-2222-4222-8222-222222222222';
const ACC = '33333333-3333-4333-8333-333333333333';
const DISCORD_ID = '123456789012345678';
const now = () => new Date('2026-11-02T10:00:00Z');

// A real Ed25519 key pair, so signatures are checked for real.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUBLIC_HEX = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const signed = (rawBody, timestamp = String(Math.floor(Date.now() / 1000))) => ({
  rawBody,
  timestamp,
  signature: sign(null, Buffer.from(timestamp + rawBody), privateKey).toString('hex'),
  publicKey: PUBLIC_HEX,
});

function fakeSql(routes) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ');
    calls.push({ text, values });
    for (const [pattern, rows] of routes) if (pattern.test(text)) return rows;
    return [];
  };
  sql.calls = calls;
  return sql;
}

const linked = [/FROM quick_api_keys k JOIN workspace_members wm .* k.discord_user_id/, [{ kid: 'k1', uid: UID, ws: WS }]];
const accounts = [/FROM accounts WHERE workspace_id = \? AND NOT is_archived AND NOT memo$/, [
  { id: ACC, name: 'HDFC Card', currency: 'INR' },
  { id: 'a2', name: 'Cash', currency: 'INR' },
]];
const load = [/FROM quick_captures WHERE user_id/, [{ pending: 0, recent: 0 }]];
const last = [/FROM quick_captures q JOIN accounts a/, [{ name: 'HDFC Card' }]];
const inserted = (sql) => sql.calls.find((c) => /INSERT INTO quick_captures/.test(c.text));

const command = (name, user = { id: DISCORD_ID }) => ({ type: 2, id: 'i1', member: { user }, data: { name } });
const submitted = (fields, type = 'EXPENSE', id = '998877665544') => ({
  type: 5,
  id,
  user: { id: DISCORD_ID },
  data: { custom_id: `qa:${type}`, components: Object.entries(fields).map(([custom_id, value]) => ({ type: 1, components: [{ type: 4, custom_id, value }] })) },
});

describe('signature', () => {
  it('accepts a request Discord signed', () => {
    const r = signed('{"type":1}');
    expect(verifyDiscordSignature({ publicKeyHex: r.publicKey, signatureHex: r.signature, timestamp: r.timestamp, rawBody: r.rawBody })).toBe(true);
  });

  it('rejects a changed body, a wrong key, a bad signature and an old request', () => {
    const r = signed('{"type":1}');
    const base = { publicKeyHex: r.publicKey, signatureHex: r.signature, timestamp: r.timestamp, rawBody: r.rawBody };
    expect(verifyDiscordSignature({ ...base, rawBody: '{"type":2}' })).toBe(false);
    expect(verifyDiscordSignature({ ...base, publicKeyHex: 'a'.repeat(64) })).toBe(false);
    expect(verifyDiscordSignature({ ...base, signatureHex: '0'.repeat(128) })).toBe(false);
    expect(verifyDiscordSignature({ ...base, signatureHex: 'nonsense' })).toBe(false);
    expect(verifyDiscordSignature({ ...base, publicKeyHex: undefined })).toBe(false);
    const old = signed('{"type":1}', String(Math.floor(Date.now() / 1000) - 3600));
    expect(verifyDiscordSignature({ publicKeyHex: old.publicKey, signatureHex: old.signature, timestamp: old.timestamp, rawBody: old.rawBody })).toBe(false);
  });
});

describe('endpoint', () => {
  it('answers Discord\'s ping without needing the database', async () => {
    const r = await respondToDiscord(signed('{"type":1}'), () => { throw new Error('db not needed'); });
    expect(r).toEqual({ status: 200, body: { type: 1 } });
  });

  it('refuses an unsigned or wrongly signed request with 401', async () => {
    const r = signed('{"type":2}');
    expect((await respondToDiscord({ ...r, signature: '0'.repeat(128) }, () => ({ sql: fakeSql([]) }))).status).toBe(401);
    expect((await respondToDiscord({ ...r, signature: null }, () => ({ sql: fakeSql([]) }))).status).toBe(401);
  });
});

describe('commands', () => {
  it('opens the form for a linked user, starting on the account used last', async () => {
    const sql = fakeSql([linked, last]);
    const res = await handleInteraction(command('spend'), { sql, now });
    expect(res.type).toBe(9);
    expect(res.data.custom_id).toBe('qa:EXPENSE');
    const fields = res.data.components.map((r) => r.components[0]);
    expect(fields.map((f) => f.custom_id)).toEqual(['amount', 'account', 'category', 'payee', 'note']);
    expect(fields[0].required).toBe(true);
    expect(fields[1].value).toBe('HDFC Card');
  });

  it('opens an income form for /income', async () => {
    const res = await handleInteraction(command('income'), { sql: fakeSql([linked]), now });
    expect(res.data.custom_id).toBe('qa:INCOME');
  });

  it('works from a direct message, where Discord sends user instead of member', async () => {
    const res = await handleInteraction({ type: 2, id: 'i', user: { id: DISCORD_ID }, data: { name: 'spend' } }, { sql: fakeSql([linked]), now });
    expect(res.type).toBe(9);
  });

  it('tells an unlinked Discord user how to link, showing their id', async () => {
    const res = await handleInteraction(command('spend', { id: '555555555555' }), { sql: fakeSql([]), now });
    expect(res.type).toBe(4);
    expect(res.data.flags).toBe(64);
    expect(res.data.content).toContain('555555555555');
  });
});

describe('submitted form', () => {
  const fields = { amount: '450.50', account: 'hdfc card', category: 'Food', payee: ' Swiggy ', note: 'lunch' };

  it('saves the entry for the linked key owner and confirms privately', async () => {
    const sql = fakeSql([linked, accounts, load]);
    const res = await handleInteraction(submitted(fields), { sql, now });
    expect(inserted(sql).values.slice(0, 7)).toEqual([WS, UID, 'EXPENSE', 45050, 'INR', '2026-11-02', ACC]);
    expect(res.data.content).toMatch(/Saved .*450\.50 on HDFC Card/);
    expect(res.data.flags).toBe(64);
  });

  it('saves income and uses Discord\'s interaction id so a retry is stored once', async () => {
    const sql = fakeSql([linked, accounts, load]);
    await handleInteraction(submitted({ amount: '1000', account: 'Cash' }, 'INCOME', '777666555'), { sql, now });
    expect(inserted(sql).values.slice(2, 4)).toEqual(['INCOME', 100000]);
    expect(inserted(sql).values.at(-1)).toBe('d-777666555');
  });

  it('lists the accounts when the typed one does not exist, and saves nothing', async () => {
    const sql = fakeSql([linked, accounts, load]);
    const res = await handleInteraction(submitted({ ...fields, account: 'Nope' }), { sql, now });
    expect(res.data.content).toContain('could not find the account "Nope"');
    expect(res.data.content).toContain('HDFC Card, Cash');
    expect(inserted(sql)).toBeUndefined();
  });

  it('rejects a bad amount without saving', async () => {
    const sql = fakeSql([linked, accounts, load]);
    const res = await handleInteraction(submitted({ ...fields, amount: 'abc' }), { sql, now });
    expect(res.data.content).toContain('not valid');
    expect(inserted(sql)).toBeUndefined();
  });

  it('keeps an entry whose category is misspelt and says so', async () => {
    const sql = fakeSql([linked, accounts, load]);
    const res = await handleInteraction(submitted({ ...fields, category: 'Fod' }), { sql, now });
    expect(res.data.content).toContain('could not find the category "Fod"');
    expect(inserted(sql)).toBeDefined();
  });

  it('refuses when the Discord account is not linked, or the form is unknown', async () => {
    const unlinked = await handleInteraction(submitted(fields), { sql: fakeSql([]), now });
    expect(unlinked.data.content).toContain('not linked');
    const odd = await handleInteraction({ ...submitted(fields), data: { custom_id: 'other', components: [] } }, { sql: fakeSql([linked]), now });
    expect(odd.data.content).toContain('no longer valid');
  });

  it('never pings anyone from what a user typed', async () => {
    const res = await handleInteraction(submitted({ ...fields, account: '@everyone' }), { sql: fakeSql([linked, accounts, load]), now });
    expect(res.data.allowed_mentions).toEqual({ parse: [] });
  });
});
