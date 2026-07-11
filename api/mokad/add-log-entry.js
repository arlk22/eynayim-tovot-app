import { createRecord, updateRecord } from '../_lib/airtable.js';
import { verifyMokad } from '../_lib/mokad-auth.js';
import { TABLES, ACTIVITY_LOG_FIELDS, HADAR_REPORT_FIELDS } from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, reportId, actionType, content, newStatus } = req.body || {};
  const mokadan = await verifyMokad(volunteerId, password);
  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!reportId || !actionType) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    const created = await createRecord(TABLES.ACTIVITY_LOG, {
      [ACTIVITY_LOG_FIELDS.RELATED_REPORT]: [reportId],
      [ACTIVITY_LOG_FIELDS.ACTION_TYPE]: actionType,
      [ACTIVITY_LOG_FIELDS.CONTENT]: content || '',
      [ACTIVITY_LOG_FIELDS.VOLUNTEER]: [volunteerId],
      [ACTIVITY_LOG_FIELDS.DATETIME]: new Date().toISOString(),
    });

    if (newStatus) {
      await updateRecord(TABLES.HADAR_NEW_REPORT, reportId, {
        [HADAR_REPORT_FIELDS.STATUS]: newStatus,
      });
    }

    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'log_entry_failed' });
  }
}
