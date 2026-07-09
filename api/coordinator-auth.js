import { verifyCoordinator } from './_lib/coordinator-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password } = req.body || {};
  const coordinator = await verifyCoordinator(volunteerId, password);

  if (!coordinator) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  res.status(200).json({ ok: true });
}
