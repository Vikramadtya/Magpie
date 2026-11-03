// Server side of quick add. It runs as Vercel functions, separate from the main Keeper server, so
// adding a transaction never waits for that server to wake up. Callers (the /quickadd page, an iPhone
// Shortcut, a Google Form script, ...) present a revocable key that Keeper's Settings page creates;
// the key can only add entries to the "To review" list. Everything here is plain logic over an
// injected `sql` so it can be tested without a network or a database.
import { createHash } from 'node:crypto';

const MAX_PENDING = 200;
const MAX_PER_MINUTE = 20;
const MAX_MINOR = 1_000_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minor units per major unit for a currency (JPY 0, USD 2, KWD 3), as Keeper itself uses. */
export function exponentOf(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** "1,234.5" (or the number 1234.5) to minor units, or null when it is not a valid positive amount. */
export function parseAmount(value, currency) {
  const cleaned = String(value ?? '').replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.' || (cleaned.match(/\./g)?.length ?? 0) > 1) return null;
  const exp = exponentOf(currency);
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > exp) return null;
  const minor = Number(whole + frac.padEnd(exp, '0'));
  return Number.isSafeInteger(minor) && minor > 0 && minor <= MAX_MINOR ? minor : null;
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const json = (res, status, body) => res.status(status).json(body);

/** The user and ledger a presented key belongs to, or null (unknown, revoked, or access removed). */
export async function authenticate(sql, req) {
  const header = String(req.headers.authorization ?? '');
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!key.startsWith('qak_') || key.length > 100) return null;
  const rows = await sql`
    SELECT k.id AS kid, k.user_id AS uid, k.workspace_id AS ws
    FROM quick_api_keys k
    JOIN workspace_members wm ON wm.user_id = k.user_id AND wm.workspace_id = k.workspace_id AND wm.role IN ('OWNER', 'EDITOR')
    JOIN users u ON u.id = k.user_id AND u.deleted_at IS NULL
    WHERE k.key_hash = ${sha256(key)} AND k.revoked_at IS NULL`;
  if (rows.length === 0) return null;
  await sql`UPDATE quick_api_keys SET last_used_at = now() WHERE id = ${rows[0].kid}`;
  return rows[0];
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

export async function handleChoices(req, res, { sql }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  const who = await authenticate(sql, req);
  if (!who) return json(res, 401, { error: 'bad_key' });
  return json(res, 200, await listChoices(sql, who.ws));
}

const validDate = (text) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Finds the account the entry is for: by id, by name, or the only account there is. */
async function findAccount(sql, ws, body) {
  const usable = await sql`
    SELECT id, name, currency FROM accounts WHERE workspace_id = ${ws} AND NOT is_archived AND NOT memo`;
  let matches;
  if (body.accountId) matches = usable.filter((a) => a.id === String(body.accountId).toLowerCase());
  else if (body.account) matches = usable.filter((a) => a.name.toLowerCase() === text(body.account, 120).toLowerCase());
  else matches = usable.length === 1 ? usable : [];
  return { matches, names: usable.map((a) => a.name) };
}

/** Finds the category by id or name; an unknown name is not an error (the entry is still kept). */
async function findCategory(sql, ws, body, type) {
  if (body.categoryId) {
    if (!UUID.test(String(body.categoryId))) return { bad: true };
    const found = await sql`SELECT id FROM categories WHERE id = ${body.categoryId} AND workspace_id = ${ws}`;
    return found.length ? { id: found[0].id } : { bad: true };
  }
  const name = text(body.category, 120);
  if (!name) return {};
  const rows = await sql`
    SELECT id, parent_id AS "parentId" FROM categories
    WHERE workspace_id = ${ws} AND NOT is_archived AND kind = ${type} AND lower(name) = ${name.toLowerCase()}`;
  const best = rows.find((c) => !c.parentId) ?? rows[0];
  return best ? { id: best.id } : { unknownName: name };
}

/**
 * Validates one entry and puts it in the review list for the key's owner. Used by every way in
 * (the JSON endpoint, Discord, ...). Returns { status, body } so each caller can answer in its own way.
 */
export async function recordEntry(sql, who, input, now = () => new Date()) {
  const b = input && typeof input === 'object' ? input : {};
  const fail = (status, payload) => ({ status, body: payload });
  const type = b.type === undefined || b.type === 'EXPENSE' || b.type === 'expense' ? 'EXPENSE' : b.type === 'INCOME' || b.type === 'income' ? 'INCOME' : null;
  const payee = text(b.payee, 160);
  let note = text(b.note, 1000);
  const today = now().toISOString().slice(0, 10);
  const occurredOn = typeof b.occurredOn === 'string' && validDate(b.occurredOn) ? b.occurredOn : today;
  const badId = (v) => v !== undefined && v !== null && v !== '' && !UUID.test(String(v));
  if (!type || badId(b.accountId) || (b.key !== undefined && !/^[A-Za-z0-9-]{8,64}$/.test(String(b.key)))) {
    return fail(400, { error: 'invalid' });
  }
  if (occurredOn > new Date(Date.parse(today) + 2 * 86400000).toISOString().slice(0, 10) || occurredOn < '2000-01-01') {
    return fail(400, { error: 'invalid_date' });
  }

  const { matches, names } = await findAccount(sql, who.ws, b);
  if (matches.length !== 1) {
    return fail(400, { error: matches.length > 1 ? 'ambiguous_account' : b.account || b.accountId ? 'unknown_account' : 'account_required', accounts: names });
  }
  const account = matches[0];
  const currency = String(account.currency).trim();
  const minor = parseAmount(b.amount, currency);
  if (minor === null) return fail(400, { error: 'invalid_amount' });

  const category = await findCategory(sql, who.ws, b, type);
  if (category.bad) return fail(400, { error: 'unknown_category' });
  // Don't lose an entry over a misspelt category: keep it and say what was meant.
  if (category.unknownName) note = [note, `Category: ${category.unknownName}`].filter(Boolean).join(' · ');

  // Limits, so a leaked key cannot flood the review list.
  const [load] = await sql`
    SELECT count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
           count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS recent
    FROM quick_captures WHERE user_id = ${who.uid}`;
  if (load.recent >= MAX_PER_MINUTE || load.pending >= MAX_PENDING) return fail(429, { error: 'too_many' });

  // A retry or a double tap is stored once. Callers without their own key get one from the content
  // and the current minute.
  const key =
    b.key !== undefined
      ? String(b.key)
      : `auto-${sha256([who.uid, account.id, minor, occurredOn, payee, note, today, now().toISOString().slice(0, 16)].join('|')).slice(0, 32)}`;
  await sql`
    INSERT INTO quick_captures(workspace_id, user_id, type, amount_minor, currency, occurred_on,
                               account_id, category_id, payee_text, note, idempotency_key)
    VALUES (${who.ws}, ${who.uid}, ${type}, ${minor}, ${currency}, ${occurredOn},
            ${account.id}, ${category.id ?? null}, ${payee || null}, ${note || null}, ${key})
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`;
  return { status: 200, body: { saved: true, amountMinor: minor, currency, account: account.name, categoryFound: Boolean(category.id), unknownCategory: category.unknownName ?? null } };
}

export async function handleSubmit(req, res, { sql, now = () => new Date() }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  const who = await authenticate(sql, req);
  if (!who) return json(res, 401, { error: 'bad_key' });
  const result = await recordEntry(sql, who, req.body, now);
  return json(res, result.status, result.body);
}
