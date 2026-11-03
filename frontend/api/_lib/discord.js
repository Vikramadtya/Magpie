// Discord front end for quick add. /spend and /income open a pop-up form in Discord; submitting it
// sends the entry to Keeper's "To review" list, exactly like the JSON endpoint. Discord calls this
// over HTTPS (an "interactions endpoint"), signing every request, so no bot has to stay connected.
import { createPublicKey, verify } from 'node:crypto';
import { exponentOf, recordEntry } from './quickadd.js';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const MAX_AGE_SECONDS = 300;
const EPHEMERAL = 64; // only the person who typed the command sees the reply
const COMMANDS = { spend: 'EXPENSE', income: 'INCOME' };

/** Checks Discord's Ed25519 signature over timestamp + body, and that the request is recent. */
export function verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp, rawBody, nowSeconds = Date.now() / 1000 }) {
  try {
    if (!/^[0-9a-f]{64}$/i.test(String(publicKeyHex)) || !/^[0-9a-f]{128}$/i.test(String(signatureHex))) return false;
    if (!(Math.abs(nowSeconds - Number(timestamp)) <= MAX_AGE_SECONDS)) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(String(timestamp) + rawBody), key, Buffer.from(signatureHex, 'hex'));
  } catch {
    return false;
  }
}

const say = (content) => ({ type: 4, data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } } });

const money = (minor, currency) => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 10 ** exponentOf(currency));
  } catch {
    return `${minor / 100} ${currency}`;
  }
};

const input = (customId, label, extra = {}) => ({
  type: 1,
  components: [{ type: 4, custom_id: customId, label, style: 1, required: false, max_length: 100, ...extra }],
});

/** The pop-up form. The account starts as the one used last. */
function form(type, lastAccount) {
  return {
    type: 9,
    data: {
      custom_id: `qa:${type}`,
      title: type === 'INCOME' ? 'Add income' : 'Add expense',
      components: [
        input('amount', 'Amount', { required: true, max_length: 20, placeholder: '450.50' }),
        input('account', 'Account', { placeholder: 'e.g. HDFC Card', ...(lastAccount ? { value: lastAccount } : {}) }),
        input('category', 'Category', { placeholder: 'e.g. Food' }),
        input('payee', 'Paid to / what for', { max_length: 100, placeholder: 'e.g. Swiggy' }),
        input('note', 'Note', { style: 2, max_length: 300 }),
      ],
    },
  };
}

/** Which Keeper user and ledger a Discord account files entries under (a linked, active key). */
async function findLinked(sql, discordId) {
  if (!/^\d{5,25}$/.test(String(discordId ?? ''))) return null;
  const rows = await sql`
    SELECT k.id AS kid, k.user_id AS uid, k.workspace_id AS ws
    FROM quick_api_keys k
    JOIN workspace_members wm ON wm.user_id = k.user_id AND wm.workspace_id = k.workspace_id AND wm.role IN ('OWNER', 'EDITOR')
    JOIN users u ON u.id = k.user_id AND u.deleted_at IS NULL
    WHERE k.discord_user_id = ${String(discordId)} AND k.revoked_at IS NULL`;
  if (rows.length === 0) return null;
  await sql`UPDATE quick_api_keys SET last_used_at = now() WHERE id = ${rows[0].kid}`;
  return rows[0];
}

async function lastAccountName(sql, uid) {
  const rows = await sql`
    SELECT a.name FROM quick_captures q JOIN accounts a ON a.id = q.account_id
    WHERE q.user_id = ${uid} ORDER BY q.created_at DESC LIMIT 1`;
  return rows[0]?.name ?? null;
}

/** Flattens a submitted modal into { amount, account, ... }. */
function answers(components) {
  const out = {};
  for (const row of components ?? []) for (const c of row.components ?? []) out[c.custom_id] = typeof c.value === 'string' ? c.value : '';
  return out;
}

const notLinked = (id) =>
  `This Discord account is not linked to Keeper yet. In Keeper, open **Settings, Quick add**, create a key and put this in the "Discord user ID" box: \`${id}\``;

function reply(result, a) {
  const { status, body } = result;
  if (status === 200) {
    const where = `${money(body.amountMinor, body.currency)} on ${body.account}`;
    const extra = body.unknownCategory ? `\nI could not find the category "${body.unknownCategory}", so it is in the note.` : '';
    return say(`✅ Saved ${where}. It is waiting in Keeper's **To review**.${extra}`);
  }
  const names = Array.isArray(body.accounts) && body.accounts.length ? `\nYour accounts: ${body.accounts.join(', ')}` : '';
  const tried = [a.amount, a.account, a.category, a.payee].filter(Boolean).join(' · ');
  const problems = {
    unknown_account: `I could not find the account "${a.account}".${names}`,
    ambiguous_account: `More than one account is called "${a.account}".${names}`,
    account_required: `Which account? Type its name.${names}`,
    invalid_amount: 'That amount is not valid. Use a number like 450.50.',
    invalid_date: 'That date is not valid.',
    too_many: 'Too many entries are waiting. Review some in Keeper first, then try again.',
  };
  return say(`❌ ${problems[body.error] ?? 'Could not save that entry.'}${tried ? `\nWhat you typed: ${tried}` : ''}`);
}

/** Answers one verified Discord interaction. */
export async function handleInteraction(interaction, { sql, now = () => new Date() }) {
  if (interaction.type === 1) return { type: 1 }; // Discord's ping when the endpoint is saved
  const discordId = interaction.member?.user?.id ?? interaction.user?.id;

  if (interaction.type === 2) {
    const type = COMMANDS[interaction.data?.name];
    if (!type) return say('I do not know that command.');
    const who = await findLinked(sql, discordId);
    if (!who) return say(notLinked(discordId));
    return form(type, await lastAccountName(sql, who.uid));
  }

  if (interaction.type === 5) {
    const type = String(interaction.data?.custom_id ?? '').startsWith('qa:') ? interaction.data.custom_id.slice(3) : null;
    if (type !== 'EXPENSE' && type !== 'INCOME') return say('That form is no longer valid. Run the command again.');
    const who = await findLinked(sql, discordId);
    if (!who) return say(notLinked(discordId));
    const a = answers(interaction.data.components);
    // Discord's own interaction id repeats safely if Discord retries.
    const key = `d-${String(interaction.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 40)}`;
    const entry = { type, amount: a.amount, account: a.account, category: a.category, payee: a.payee, note: a.note, key };
    return reply(await recordEntry(sql, who, entry, now), a);
  }
  return say('That is not supported.');
}

/**
 * The HTTP side: verify the signature, then answer. `getDeps` is only called when the database is
 * needed, so Discord's ping works before the database is configured. Returns { status, body }.
 */
export async function respondToDiscord({ rawBody, signature, timestamp, publicKey }, getDeps, nowSeconds) {
  if (!verifyDiscordSignature({ publicKeyHex: publicKey, signatureHex: signature, timestamp, rawBody, nowSeconds })) {
    return { status: 401, body: { error: 'bad_signature' } };
  }
  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'bad_request' } };
  }
  const deps = interaction.type === 1 ? {} : getDeps();
  return { status: 200, body: await handleInteraction(interaction, deps) };
}
