import { productionDeps } from '../_lib/deps.js';
import { handleSubmit } from '../_lib/quickadd.js';

export default async function handler(req, res) {
  try {
    return await handleSubmit(req, res, productionDeps());
  } catch (e) {
    console.error('quickadd submit failed:', e.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
