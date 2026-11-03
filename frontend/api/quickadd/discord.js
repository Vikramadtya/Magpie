import { productionDeps } from '../_lib/deps.js';
import { respondToDiscord } from '../_lib/discord.js';

/** Discord's "interactions endpoint". Web-standard handler so the exact body bytes can be verified. */
export async function POST(request) {
  try {
    const result = await respondToDiscord(
      {
        rawBody: await request.text(),
        signature: request.headers.get('x-signature-ed25519'),
        timestamp: request.headers.get('x-signature-timestamp'),
        publicKey: process.env.DISCORD_PUBLIC_KEY,
      },
      productionDeps,
    );
    return Response.json(result.body, { status: result.status });
  } catch (e) {
    console.error('discord interaction failed:', e.message);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
