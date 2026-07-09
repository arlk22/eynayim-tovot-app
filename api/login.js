import { listRecords, updateRecord } from './_lib/airtable.js';
import { TABLES, VOLUNTEER_FIELDS, COORDINATOR_ROLES } from './_lib/fields.js';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone } = req.body || {};
  const normalized = normalizePhone(phone);
  if (!normalized) {
    res.status(400).json({ error: 'missing_phone' });
    return;
  }

  try {
    const volunteers = await listRecords(TABLES.VOLUNTEERS, {
      fields: [
        VOLUNTEER_FIELDS.NAME,
        VOLUNTEER_FIELDS.PHONE,
        VOLUNTEER_FIELDS.DEVICE_CLAIMED,
        VOLUNTEER_FIELDS.ROLE,
      ],
    });

    const match = volunteers.find(
      (v) => normalizePhone(v.fields[VOLUNTEER_FIELDS.PHONE]) === normalized
    );

    if (!match) {
      res.status(404).json({ error: 'phone_not_found' });
      return;
    }

    if (match.fields[VOLUNTEER_FIELDS.DEVICE_CLAIMED]) {
      res.status(409).json({ error: 'already_claimed' });
      return;
    }

    await updateRecord(TABLES.VOLUNTEERS, match.id, {
      [VOLUNTEER_FIELDS.DEVICE_CLAIMED]: true,
    });

    res.status(200).json({
      id: match.id,
      name: match.fields[VOLUNTEER_FIELDS.NAME] || '',
      isCoordinator: COORDINATOR_ROLES.includes(match.fields[VOLUNTEER_FIELDS.ROLE]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'login_failed' });
  }
}
