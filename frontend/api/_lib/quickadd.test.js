import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { describe, expect, it } from 'vitest';
import { handleSession, handleSubmit, parseAmount, signSession, verifyGoogle } from './quickadd.js';

const UID = '11111111-1111-4111-8111-111111111111';
const WS = '22222222-2222-4222-8222-222222222222';
const ACC = '33333333-3333-4333-8333-333333333333';
const env = { secret: 'x'.repeat(40), clientId: 'client-123', insecureCookie: false };

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
  res.end = () => res;
  return res;
}

const post = (body, headers = {}) => ({ method: 'POST', headers: { 'x-quickadd': '1', ...headers }, body });
const signedIn = async () => `qa_session=${await signSession({ uid: UID, ws: WS, name: 'Asha' }, env.secret)}`;

const access = [/FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.user_id/, [{ ok: 1 }]];
const account = [/FROM accounts WHERE id =/, [{ id: ACC, currency: 'USD' }]];
const load = [/FROM quick_captures WHERE user_id/, [{ pending: 0, recent: 0 }]];

describe('parseAmount', () => {
  it('reads decimal text in the currency of the account', () => {
    expect(parseAmount('1,234.50', 'USD')).toBe(123450);
    expect(parseAmount('450', 'JPY')).toBe(450);
    expect(parseAmount('12.345', 'KWD')).toBe(12345);
  });
  it('rejects empty, zero, too precise and non-numeric amounts', () => {
    for (const bad of ['', '0', 'abc', '1.234', '1.2.3', '9'.repeat(20)]) expect(parseAmount(bad, 'USD')).toBeNull();
  });
});

describe('verifyGoogle', () => {
  async function token({ aud = 'client-123', verified = true } = {}) {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'k1' };
    const jwt = await new SignJWT({ email: 'Asha@Example.com', email_verified: verified, name: 'Asha' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com').setAudience(aud).setExpirationTime('5m').sign(privateKey);
    return { jwt, keys: createLocalJWKSet({ keys: [jwk] }) };
  }
  it('accepts a valid credential and lowercases the email', async () => {
    const { jwt, keys } = await token();
    expect(await verifyGoogle(jwt, 'client-123', keys)).toEqual({ email: 'asha@example.com', name: 'Asha' });
  });
  it("rejects another app's credential and unverified emails", async () => {
    const other = await token({ aud: 'someone-else' });
    await expect(verifyGoogle(other.jwt, 'client-123', other.keys)).rejects.toThrow();
    const unverified = await token({ verified: false });
    await expect(verifyGoogle(unverified.jwt, 'client-123', unverified.keys)).rejects.toThrow();
  });
});

describe('session', () => {
  const verify = async () => ({ email: 'asha@example.com', name: 'Asha' });

  const form = (credential, token = 'csrf-1', cookieToken = 'csrf-1') => ({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: `g_csrf_token=${cookieToken}` },
    body: { credential, g_csrf_token: token },
  });
  const knownUser = [/FROM users u JOIN workspace_members/, [{ uid: UID, name: 'Asha', ws: WS }]];

  it('signs a known Google user in and sends them back to the page with a session cookie', async () => {
    const res = response();
    await handleSession(form('g'), res, { sql: fakeSql([knownUser]), env, verify });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/quickadd');
    expect(res.headers['set-cookie']).toMatch(/HttpOnly; SameSite=Lax; Secure/);
  });

  it('sends a Google account with no Keeper user back with a reason and no cookie', async () => {
    const res = response();
    await handleSession(form('g'), res, { sql: fakeSql([]), env, verify });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/quickadd?signin=no_account');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('sends a credential Google would not vouch for back with a reason', async () => {
    const res = response();
    await handleSession(form('bad'), res, { sql: fakeSql([knownUser]), env, verify: async () => { throw new Error('no'); } });
    expect(res.headers.location).toBe('/quickadd?signin=failed');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refuses a sign-in whose CSRF token does not match the cookie', async () => {
    for (const req of [form('g', 'a', 'b'), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: { credential: 'g' } }]) {
      const res = response();
      await handleSession(req, res, { sql: fakeSql([knownUser]), env, verify });
      expect(res.statusCode).toBe(400);
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('answers a visitor who is not signed in with the client id and nothing else', async () => {
    const res = response();
    await handleSession({ method: 'GET', headers: {} }, res, { sql: fakeSql([]), env });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ clientId: 'client-123' });
  });

  it('does not accept a session cookie signed with another secret', async () => {
    const forged = `qa_session=${await signSession({ uid: UID, ws: WS }, 'y'.repeat(40))}`;
    const res = response();
    await handleSession({ method: 'GET', headers: { cookie: forged } }, res, { sql: fakeSql([access]), env });
    expect(res.statusCode).toBe(401);
  });

  it('ends a session when the user lost access to the workspace', async () => {
    const res = response();
    await handleSession({ method: 'GET', headers: { cookie: await signedIn() } }, res, { sql: fakeSql([]), env });
    expect(res.statusCode).toBe(401);
  });
});

describe('submit', () => {
  const body = { type: 'EXPENSE', amount: '450.50', accountId: ACC, payee: ' Swiggy ', note: 'lunch', occurredOn: '2026-11-02', key: 'abcd-1234-efgh' };
  const run = async (b, routes = [access, account, load], headers) => {
    const sql = fakeSql(routes);
    const res = response();
    await handleSubmit(post(b, { cookie: await signedIn(), ...headers }), res, { sql, env, now: () => new Date('2026-11-02T10:00:00Z') });
    return { res, sql };
  };
  const inserted = (sql) => sql.calls.find((c) => /INSERT INTO quick_captures/.test(c.text));

  it('stores the entry under the signed-in user and workspace, in the account currency', async () => {
    const { res, sql } = await run(body);
    expect(res.statusCode).toBe(200);
    expect(inserted(sql).values.slice(0, 6)).toEqual([WS, UID, 'EXPENSE', 45050, 'USD', '2026-11-02']);
    expect(inserted(sql).values).toContain('Swiggy');
  });

  it('ignores a user or workspace sent in the body', async () => {
    const { sql } = await run({ ...body, userId: 'x', workspaceId: 'y', user_id: 'z' });
    expect(inserted(sql).values.slice(0, 2)).toEqual([WS, UID]);
  });

  it('rejects an account that is not in the signed-in workspace', async () => {
    const { res, sql } = await run(body, [access, [/FROM accounts WHERE id =/, []], load]);
    expect(res.statusCode).toBe(400);
    expect(inserted(sql)).toBeUndefined();
  });

  it('rejects bad input without touching the queue', async () => {
    const bad = [{ ...body, amount: 'abc' }, { ...body, type: 'TRANSFER' }, { ...body, key: 'x' }, { ...body, accountId: 'nope' }, { ...body, occurredOn: '2031-01-01' }];
    for (const b of bad) {
      const { res, sql } = await run(b);
      expect(res.statusCode).toBe(400);
      expect(inserted(sql)).toBeUndefined();
    }
  });

  it('requires a session', async () => {
    const res = response();
    await handleSubmit(post(body), res, { sql: fakeSql([access]), env });
    expect(res.statusCode).toBe(401);
  });

  it('requires the same-origin header', async () => {
    const res = response();
    await handleSubmit({ method: 'POST', headers: { cookie: await signedIn() }, body }, res, { sql: fakeSql([access]), env });
    expect(res.statusCode).toBe(400);
  });

  it('stops a flood: too many in a minute, or too many waiting', async () => {
    for (const row of [{ pending: 0, recent: 20 }, { pending: 200, recent: 0 }]) {
      const { res, sql } = await run(body, [access, account, [/FROM quick_captures WHERE user_id/, [row]]]);
      expect(res.statusCode).toBe(429);
      expect(inserted(sql)).toBeUndefined();
    }
  });
});
