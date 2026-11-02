import { productionDeps } from '../_lib/deps.js';
import { handleSession } from '../_lib/quickadd.js';

export default async function handler(req, res) {
  try {
    return await handleSession(req, res, productionDeps());
  } catch (e) {
    console.error('quickadd session failed:', e.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
