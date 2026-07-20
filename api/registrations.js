import { listRecords, createRecord } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import { TABLES, REGISTRATION_FIELDS, REGISTRATION_STATUS } from './_lib/fields.js';

async function handler(req, res) {
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
    // Note: filtering by linked-record ID via FIND/ARRAYJOIN in an Airtable
    // formula doesn't work — ARRAYJOIN() on a link field resolves to the
    // linked record's primary-field text, not its ID. So we filter on the
    // (non-link) status field only, and match volunteer/patrol IDs in JS
    // against the real linked-record-id arrays from the REST API response.
    const notCancelled = await listRecords(TABLES.REGISTRATIONS, {
      filterByFormula: `NOT({${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.CANCELLED}')`,
    });
    const existing = notCancelled.find(
      (r) =>
        (r.fields[REGISTRATION_FIELDS.VOLUNTEER] || []).includes(volunteerId) &&
        (r.fields[REGISTRATION_FIELDS.PATROLS] || []).includes(patrolId)
    );

    if (existing) {
      res.status(200).json({ id: existing.id, alreadyRegistered: true });
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

export default wrapHandler('registrations', handler);
