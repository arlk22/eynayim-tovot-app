import { listRecords } from '../_lib/airtable.js';
import { verifyCoordinator } from '../_lib/coordinator-auth.js';
import { TABLES, VOLUNTEER_FIELDS, PATROL_FIELDS, EVENT_FIELDS } from '../_lib/fields.js';

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
    const [events, volunteers, patrols] = await Promise.all([
      listRecords(TABLES.PATROL_EVENTS, {
        filterByFormula: `DATETIME_FORMAT({${EVENT_FIELDS.TIME}}, 'YYYY-MM')='${month}'`,
        sort: [{ field: EVENT_FIELDS.TIME, direction: 'desc' }],
      }),
      listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] }),
      listRecords(TABLES.PATROLS, { fields: [PATROL_FIELDS.DATE] }),
    ]);

    const volunteerNameById = new Map(volunteers.map((v) => [v.id, v.fields[VOLUNTEER_FIELDS.NAME] || '']));
    const patrolDateById = new Map(patrols.map((p) => [p.id, p.fields[PATROL_FIELDS.DATE] || null]));

    const result = events.map((e) => {
      const f = e.fields;
      const reporterId = f[EVENT_FIELDS.REPORTER]?.[0];
      const patrolId = f[EVENT_FIELDS.PATROL]?.[0];
      return {
        id: e.id,
        time: f[EVENT_FIELDS.TIME] || null,
        patrolDate: patrolId ? patrolDateById.get(patrolId) || null : null,
        reporterName: reporterId ? volunteerNameById.get(reporterId) || '' : '',
        category: f[EVENT_FIELDS.CATEGORY] || '',
        location: f[EVENT_FIELDS.LOCATION] || '',
        intervention: f[EVENT_FIELDS.INTERVENTION] || '',
        description: f[EVENT_FIELDS.DESCRIPTION] || '',
        status: f[EVENT_FIELDS.STATUS] || '',
      };
    });

    res.status(200).json({ events: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load events' });
  }
}
