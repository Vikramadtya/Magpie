// Registers Keeper's two Discord commands (/spend and /income). Run it once, from your computer:
//
//   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/discord-register.mjs
//
// The commands are installable on your own Discord account, so they work in any chat or DM.
const appId = process.env.DISCORD_APP_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!appId || !token) {
  console.error('Set DISCORD_APP_ID and DISCORD_BOT_TOKEN first.');
  process.exit(1);
}

const common = { type: 1, integration_types: [0, 1], contexts: [0, 1, 2] }; // server or user install; servers, bot DMs, other DMs
const commands = [
  { ...common, name: 'spend', description: 'Add an expense to Keeper' },
  { ...common, name: 'income', description: 'Add income to Keeper' },
];

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
if (!res.ok) {
  console.error(`Discord refused (${res.status}):`, await res.text());
  process.exit(1);
}
console.log('Registered:', (await res.json()).map((c) => `/${c.name}`).join(', '));
