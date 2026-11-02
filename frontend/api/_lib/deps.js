import { neon } from '@neondatabase/serverless';

/** Wiring for production: the restricted database role and the secrets from Vercel's settings. */
export function productionDeps() {
  const url = process.env.QUICKADD_DATABASE_URL;
  const secret = process.env.QUICKADD_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!url || !secret || secret.length < 32 || !clientId) {
    throw new Error('Quick add is not configured: set QUICKADD_DATABASE_URL, QUICKADD_SECRET (32+ characters) and GOOGLE_CLIENT_ID');
  }
  return { sql: neon(url), env: { secret, clientId, insecureCookie: process.env.QUICKADD_INSECURE_COOKIE === '1' } };
}
