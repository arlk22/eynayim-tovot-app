import { verifyMokad } from './_lib/mokad-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password } = req.body || {};
  const mokadan = await verifyMokad(volunteerId, password);

  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  res.status(200).json({ ok: true });
}
