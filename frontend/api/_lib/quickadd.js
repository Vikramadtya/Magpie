// Server side of the /quickadd page. It runs as Vercel functions, separate from the main Keeper
// server, so adding a transaction never waits for that server to wake up. Everything here is
// pure logic over injected dependencies ({ sql, env, verify }) so it can be tested without a
// network or a database.
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const COOKIE = 'qa_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const MAX_PENDING = 200;
const MAX_PER_MINUTE = 20;
const MAX_MINOR = 1_000_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Checks a Google sign-in credential and returns the verified email and name. */
export async function verifyGoogle(credential, clientId, keys = googleKeys) {
  const { payload } = await jwtVerify(credential, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });
  if (payload.email_verified !== true || typeof payload.email !== 'string') {
    throw new Error('Google email is not verified');
  }
  return { email: payload.email.toLowerCase(), name: typeof payload.name === 'string' ? payload.name : '' };
}

const secretKey = (secret) => new TextEncoder().encode(secret);

export async function signSession(claims, secret) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function readSession(cookieHeader, secret) {
  const raw = (cookieHeader ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw.slice(COOKIE.length + 1), secretKey(secret), { algorithms: ['HS256'] });
    return typeof payload.uid === 'string' && typeof payload.ws === 'string' ? payload : null;
  } catch {
    return null;
  }
}

const cookieAttrs = (env) => `Path=/api/quickadd; HttpOnly; SameSite=Strict${env.insecureCookie ? '' : '; Secure'}`;

export const sessionCookie = (token, env) => `${COOKIE}=${token}; Max-Age=${SESSION_SECONDS}; ${cookieAttrs(env)}`;
export const clearCookie = (env) => `${COOKIE}=; Max-Age=0; ${cookieAttrs(env)}`;

/** Minor units per major unit for a currency (JPY 0, USD 2, KWD 3), as Keeper itself uses. */
export function exponentOf(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** "1,234.5" to minor units, or null when it is not a valid positive amount. */
export function parseAmount(text, currency) {
  const cleaned = String(text ?? '').replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.' || (cleaned.match(/\./g)?.length ?? 0) > 1) return null;
  const exp = exponentOf(currency);
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > exp) return null;
  const minor = Number(whole + frac.padEnd(exp, '0'));
  return Number.isSafeInteger(minor) && minor > 0 && minor <= MAX_MINOR ? minor : null;
}

// ---------- database ----------

/** The Keeper user (and the workspace to file things in) behind a verified Google email. */
export async function findUser(sql, email) {
  const rows = await sql`
    SELECT u.id AS uid, u.name, wm.workspace_id AS ws
    FROM users u JOIN workspace_members wm ON wm.user_id = u.id
    WHERE lower(u.email) = ${email} AND u.deleted_at IS NULL AND wm.role IN ('OWNER', 'EDITOR')
    ORDER BY (wm.role = 'OWNER') DESC, wm.joined_at
    LIMIT 1`;
  return rows[0] ?? null;
}

/** Whether this user may still add to this workspace (they may have been removed since signing in). */
export async function hasAccess(sql, uid, ws) {
  const rows = await sql`
    SELECT 1 AS ok FROM workspace_members wm JOIN users u ON u.id = wm.user_id
    WHERE wm.user_id = ${uid} AND wm.workspace_id = ${ws} AND wm.role IN ('OWNER', 'EDITOR') AND u.deleted_at IS NULL`;
  return rows.length > 0;
}

export async function listChoices(sql, ws) {
  const accounts = await sql`
    SELECT id, name, type, currency FROM accounts
    WHERE workspace_id = ${ws} AND NOT is_archived AND NOT memo ORDER BY name`;
  const categories = await sql`
    SELECT id, name, kind, parent_id AS "parentId" FROM categories
    WHERE workspace_id = ${ws} AND NOT is_archived ORDER BY name`;
  return { accounts, categories };
}

// ---------- request handlers ----------

const json = (res, status, body) => res.status(status).json(body);

/** POST/DELETE must carry a header a plain cross-site form cannot send. */
const sameOriginCall = (req) => req.headers['x-quickadd'] === '1';

export async function handleSession(req, res, { sql, env, verify = verifyGoogle }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const session = await readSession(req.headers.cookie, env.secret);
    if (!session || !(await hasAccess(sql, session.uid, session.ws))) {
      return json(res, 401, { clientId: env.clientId });
    }
    return json(res, 200, { name: session.name ?? '', ...(await listChoices(sql, session.ws)) });
  }
  if (req.method === 'POST') {
    if (!sameOriginCall(req)) return json(res, 400, { error: 'bad_request' });
    let identity;
    try {
      identity = await verify(req.body?.credential, env.clientId);
    } catch {
      return json(res, 401, { error: 'google_rejected' });
    }
    const user = await findUser(sql, identity.email);
    if (!user) return json(res, 403, { error: 'no_account' });
    const token = await signSession({ uid: user.uid, ws: user.ws, name: user.name ?? identity.name }, env.secret);
    res.setHeader('Set-Cookie', sessionCookie(token, env));
    return json(res, 200, { name: user.name ?? identity.name, ...(await listChoices(sql, user.ws)) });
  }
  if (req.method === 'DELETE') {
    if (!sameOriginCall(req)) return json(res, 400, { error: 'bad_request' });
    res.setHeader('Set-Cookie', clearCookie(env));
    return json(res, 200, { ok: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return json(res, 405, { error: 'method_not_allowed' });
}

const validDate = (text) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));

export async function handleSubmit(req, res, { sql, env, now = () => new Date() }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  if (!sameOriginCall(req)) return json(res, 400, { error: 'bad_request' });
  const session = await readSession(req.headers.cookie, env.secret);
  if (!session || !(await hasAccess(sql, session.uid, session.ws))) return json(res, 401, { error: 'signed_out' });

  const b = req.body ?? {};
  const type = b.type === 'INCOME' ? 'INCOME' : b.type === 'EXPENSE' ? 'EXPENSE' : null;
  const key = typeof b.key === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(b.key) ? b.key : null;
  const payee = typeof b.payee === 'string' ? b.payee.trim().slice(0, 160) : '';
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : '';
  const today = now().toISOString().slice(0, 10);
  const occurredOn = typeof b.occurredOn === 'string' && validDate(b.occurredOn) ? b.occurredOn : today;
  if (!type || !key || !UUID.test(String(b.accountId)) || (b.categoryId && !UUID.test(String(b.categoryId)))) {
    return json(res, 400, { error: 'invalid' });
  }
  if (occurredOn > new Date(Date.parse(today) + 2 * 86400000).toISOString().slice(0, 10) || occurredOn < '2000-01-01') {
    return json(res, 400, { error: 'invalid_date' });
  }

  const accounts = await sql`
    SELECT id, currency FROM accounts
    WHERE id = ${b.accountId} AND workspace_id = ${session.ws} AND NOT is_archived AND NOT memo`;
  if (accounts.length === 0) return json(res, 400, { error: 'unknown_account' });
  const currency = String(accounts[0].currency).trim();
  const minor = parseAmount(b.amount, currency);
  if (minor === null) return json(res, 400, { error: 'invalid_amount' });
  if (b.categoryId) {
    const found = await sql`SELECT 1 AS ok FROM categories WHERE id = ${b.categoryId} AND workspace_id = ${session.ws}`;
    if (found.length === 0) return json(res, 400, { error: 'unknown_category' });
  }

  // Limits, so a stolen session cannot flood the review list.
  const [load] = await sql`
    SELECT count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
           count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS recent
    FROM quick_captures WHERE user_id = ${session.uid}`;
  if (load.recent >= MAX_PER_MINUTE || load.pending >= MAX_PENDING) return json(res, 429, { error: 'too_many' });

  // A retry with the same key (a flaky connection, a double tap) is stored once.
  await sql`
    INSERT INTO quick_captures(workspace_id, user_id, type, amount_minor, currency, occurred_on,
                               account_id, category_id, payee_text, note, idempotency_key)
    VALUES (${session.ws}, ${session.uid}, ${type}, ${minor}, ${currency}, ${occurredOn},
            ${b.accountId}, ${b.categoryId || null}, ${payee || null}, ${note || null}, ${key})
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`;
  return json(res, 200, { saved: true });
}
