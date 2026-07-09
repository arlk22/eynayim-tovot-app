import { listRecords, createRecord } from './_lib/airtable.js';
import { TABLES, REGISTRATION_FIELDS, REGISTRATION_STATUS } from './_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, patrolId } = req.body || {};
  if (!volunteerId || !patrolId) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    const existing = await listRecords(TABLES.REGISTRATIONS, {
      filterByFormula: `AND(NOT({${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.CANCELLED}'), FIND('${volunteerId}', ARRAYJOIN({${REGISTRATION_FIELDS.VOLUNTEER}})), FIND('${patrolId}', ARRAYJOIN({${REGISTRATION_FIELDS.PATROLS}})))`,
    });

    if (existing.length > 0) {
      res.status(200).json({ id: existing[0].id, alreadyRegistered: true });
      return;
    }

    const created = await createRecord(TABLES.REGISTRATIONS, {
      [REGISTRATION_FIELDS.PATROLS]: [patrolId],
      [REGISTRATION_FIELDS.VOLUNTEER]: [volunteerId],
      [REGISTRATION_FIELDS.STATUS]: REGISTRATION_STATUS.REGISTERED,
    });

    res.status(201).json({ id: created.id, alreadyRegistered: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'registration_failed' });
  }
}
