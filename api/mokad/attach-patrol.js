import { updateRecord, getRecord } from '../_lib/airtable.js';
import { verifyMokad } from '../_lib/mokad-auth.js';
import { TABLES, HADAR_REPORT_FIELDS, PATROL_FIELDS } from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, reportId, patrolId, note } = req.body || {};
  const mokadan = await verifyMokad(volunteerId, password);
  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!reportId || !patrolId) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    await updateRecord(TABLES.HADAR_NEW_REPORT, reportId, {
      [HADAR_REPORT_FIELDS.VERIFYING_PATROL]: [patrolId],
    });

    if (note) {
      const patrol = await getRecord(TABLES.PATROLS, patrolId);
      const existingNotes = patrol.fields[PATROL_FIELDS.NOTES] || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${note}` : note;
      await updateRecord(TABLES.PATROLS, patrolId, {
        [PATROL_FIELDS.NOTES]: updatedNotes,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'attach_failed' });
  }
}
