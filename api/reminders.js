import { listRecords } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import {
  TABLES,
  PATROL_FIELDS,
  ROUTE_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
} from './_lib/fields.js';

function tomorrowDateString() {
  // Build from local date parts (not toISOString, which is UTC and can shift
  // the date by one depending on server timezone/time of day).
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId } = req.query || {};
  if (!volunteerId) {
    res.status(400).json({ error: 'missing_volunteer' });
    return;
  }

  const tomorrow = tomorrowDateString();

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const patrols = await listRecords(TABLES.PATROLS, {
      filterByFormula: `IS_SAME({${PATROL_FIELDS.DATE}}, '${tomorrow}', 'day')`,
    });

    if (patrols.length === 0) {
      res.status(200).json({ reminders: [] });
      return;
    }

    const patrolIds = new Set(patrols.map((p) => p.id));

    // Note: linked-record IDs can't be matched via FIND/ARRAYJOIN in a formula
    // (ARRAYJOIN on a link field resolves to the linked record's primary-field
    // text, not its ID) — filter on status only, match volunteer ID in JS.
    const registered = await listRecords(TABLES.REGISTRATIONS, {
      filterByFormula: `{${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.REGISTERED}'`,
    });

    const myPatrolIds = registered
      .filter((r) => (r.fields[REGISTRATION_FIELDS.VOLUNTEER] || []).includes(volunteerId))
      .map((r) => r.fields[REGISTRATION_FIELDS.PATROLS]?.[0])
      .filter((id) => id && patrolIds.has(id));

    if (myPatrolIds.length === 0) {
      res.status(200).json({ reminders: [] });
      return;
    }

    const routes = await listRecords(TABLES.PATROL_ROUTES, { fields: [ROUTE_FIELDS.NAME] });
    const routeNameById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.NAME] || '']));

    const reminders = patrols
      .filter((p) => myPatrolIds.includes(p.id))
      .map((p) => {
        const f = p.fields;
        const routeId = f[PATROL_FIELDS.ROUTE]?.[0];
        return {
          id: p.id,
          date: f[PATROL_FIELDS.DATE] || null,
          startTime: f[PATROL_FIELDS.START_TIME] || null,
          endTime: f[PATROL_FIELDS.END_TIME] || null,
          routeName: routeId ? routeNameById.get(routeId) || null : null,
        };
      });

    res.status(200).json({ reminders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reminders' });
  }
}

export default wrapHandler('reminders', handler);
