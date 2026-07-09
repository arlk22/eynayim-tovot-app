import { updateRecord } from '../_lib/airtable.js';
import { verifyCoordinator } from '../_lib/coordinator-auth.js';
import { TABLES, EVENT_FIELDS, EVENT_STATUS } from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, eventId } = req.body || {};
  const coordinator = await verifyCoordinator(volunteerId, password);
  if (!coordinator) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!eventId) {
    res.status(400).json({ error: 'missing_event' });
    return;
  }

  try {
    await updateRecord(TABLES.PATROL_EVENTS, eventId, {
      [EVENT_FIELDS.STATUS]: EVENT_STATUS.RESOLVED,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'resolve_failed' });
  }
}
