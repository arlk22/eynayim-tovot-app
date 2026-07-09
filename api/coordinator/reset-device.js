import { updateRecord } from '../_lib/airtable.js';
import { verifyCoordinator } from '../_lib/coordinator-auth.js';
import { TABLES, VOLUNTEER_FIELDS } from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, targetVolunteerId } = req.body || {};
  const coordinator = await verifyCoordinator(volunteerId, password);
  if (!coordinator) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!targetVolunteerId) {
    res.status(400).json({ error: 'missing_target' });
    return;
  }

  try {
    await updateRecord(TABLES.VOLUNTEERS, targetVolunteerId, {
      [VOLUNTEER_FIELDS.DEVICE_CLAIMED]: false,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'reset_failed' });
  }
}
