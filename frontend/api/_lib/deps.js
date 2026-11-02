import { neon } from '@neondatabase/serverless';

/** Wiring for production: the restricted database role from Vercel's settings. */
export function productionDeps() {
  const url = process.env.QUICKADD_DATABASE_URL;
  if (!url) throw new Error('Quick add is not configured: set QUICKADD_DATABASE_URL');
  return { sql: neon(url) };
}
