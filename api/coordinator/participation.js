import { listRecords } from '../_lib/airtable.js';
import { verifyCoordinator } from '../_lib/coordinator-auth.js';
import {
  TABLES,
  VOLUNTEER_FIELDS,
  PATROL_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
} from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, month } = req.query || {};
  const coordinator = await verifyCoordinator(volunteerId, password);
  if (!coordinator) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'invalid_month' });
    return;
  }

  try {
    const [volunteers, patrols, registrations] = await Promise.all([
      listRecords(TABLES.VOLUNTEERS, {
        fields: [VOLUNTEER_FIELDS.NAME, VOLUNTEER_FIELDS.STATUS, VOLUNTEER_FIELDS.PHONE],
      }),
      listRecords(TABLES.PATROLS, {
        filterByFormula: `DATETIME_FORMAT({${PATROL_FIELDS.DATE}}, 'YYYY-MM')='${month}'`,
        fields: [],
      }),
      listRecords(TABLES.REGISTRATIONS, {
        filterByFormula: `{${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.REGISTERED}'`,
        fields: [REGISTRATION_FIELDS.PATROLS, REGISTRATION_FIELDS.VOLUNTEER],
      }),
    ]);

    const monthPatrolIds = new Set(patrols.map((p) => p.id));
    const countByVolunteer = new Map();
    for (const reg of registrations) {
      const patrolId = reg.fields[REGISTRATION_FIELDS.PATROLS]?.[0];
      const volId = reg.fields[REGISTRATION_FIELDS.VOLUNTEER]?.[0];
      if (!patrolId || !volId || !monthPatrolIds.has(patrolId)) continue;
      countByVolunteer.set(volId, (countByVolunteer.get(volId) || 0) + 1);
    }

    const result = volunteers
      .map((v) => ({
        id: v.id,
        name: v.fields[VOLUNTEER_FIELDS.NAME] || '',
        status: v.fields[VOLUNTEER_FIELDS.STATUS] || '',
        phone: v.fields[VOLUNTEER_FIELDS.PHONE] || '',
        count: countByVolunteer.get(v.id) || 0,
      }))
      .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'he'));

    res.status(200).json({ volunteers: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load participation data' });
  }
}
