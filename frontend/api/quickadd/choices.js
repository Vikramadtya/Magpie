import { productionDeps } from '../_lib/deps.js';
import { handleChoices } from '../_lib/quickadd.js';

export default async function handler(req, res) {
  try {
    return await handleChoices(req, res, productionDeps());
  } catch (e) {
    console.error('quickadd choices failed:', e.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
