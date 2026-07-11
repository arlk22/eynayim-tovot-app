import { listRecords, updateRecord } from './_lib/airtable.js';
import { verifyCoordinator } from './_lib/coordinator-auth.js';
import {
  TABLES,
  VOLUNTEER_FIELDS,
  PATROL_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
  EVENT_FIELDS,
  EVENT_STATUS,
} from './_lib/fields.js';

// Single consolidated endpoint for all coordinator actions (Vercel Hobby caps
// serverless functions at 12; this used to be 5 separate files).
async function handleParticipation(body, res) {
  const { month } = body;
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

async function handleEvents(body, res) {
  const { month } = body;
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

async function handleResetDevice(body, res) {
  const { targetVolunteerId } = body;
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

async function handleResolveEvent(body, res) {
  const { eventId } = body;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const { action, volunteerId, password } = body;
  const coordinator = await verifyCoordinator(volunteerId, password);
  if (!coordinator) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  switch (action) {
    case 'auth':
      res.status(200).json({ ok: true });
      return;
    case 'participation':
      await handleParticipation(body, res);
      return;
    case 'events':
      await handleEvents(body, res);
      return;
    case 'reset-device':
      await handleResetDevice(body, res);
      return;
    case 'resolve-event':
      await handleResolveEvent(body, res);
      return;
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
