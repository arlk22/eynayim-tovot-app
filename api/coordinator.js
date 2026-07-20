import { listRecords, updateRecord, createRecord } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import { verifyCoordinator } from './_lib/coordinator-auth.js';
import {
  TABLES,
  VOLUNTEER_FIELDS,
  PATROL_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
  EVENT_FIELDS,
  EVENT_STATUS,
  ROUTE_FIELDS,
  USAGE_LOG_FIELDS,
} from './_lib/fields.js';

const USAGE_SUMMARY_WINDOW_DAYS = 30;

function buildGoogleMapsLink(streets) {
  const points = streets.map((s) => encodeURIComponent(`${s.trim()}, חיפה`));
  return `https://www.google.com/maps/dir/${points.join('/')}`;
}

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

async function handleListRoutes(body, res) {
  try {
    const routes = await listRecords(TABLES.PATROL_ROUTES, {
      fields: [ROUTE_FIELDS.NAME, ROUTE_FIELDS.LINK, ROUTE_FIELDS.STREETS_LIST, ROUTE_FIELDS.DIRECTIONS_TEXT],
      sort: [{ field: ROUTE_FIELDS.NAME, direction: 'asc' }],
    });

    const result = routes.map((r) => {
      const f = r.fields;
      const streetsRaw = f[ROUTE_FIELDS.STREETS_LIST] || '';
      return {
        id: r.id,
        name: f[ROUTE_FIELDS.NAME] || '',
        link: f[ROUTE_FIELDS.LINK] || '',
        streets: streetsRaw ? streetsRaw.split('\n').filter(Boolean) : [],
        directionsText: f[ROUTE_FIELDS.DIRECTIONS_TEXT] || '',
      };
    });

    res.status(200).json({ routes: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load routes' });
  }
}

function rankedTotals(rows, key) {
  const totals = new Map();
  for (const row of rows) {
    const label = row[key];
    totals.set(label, (totals.get(label) || 0) + row[USAGE_LOG_FIELDS.CALLS]);
  }
  return [...totals.entries()]
    .map(([label, calls]) => ({ label, calls }))
    .sort((a, b) => b.calls - a.calls);
}

async function handleUsageSummary(body, res) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - USAGE_SUMMARY_WINDOW_DAYS);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    // Date is stored as a plain 'YYYY-MM-DD' string (not an Airtable date
    // field), so lexicographic comparison is equivalent to chronological.
    const records = await listRecords(TABLES.USAGE_LOG, {
      filterByFormula: `{${USAGE_LOG_FIELDS.DATE}} > '${cutoffKey}'`,
    });

    const rows = records.map((r) => r.fields);
    const totalCalls = rows.reduce((sum, r) => sum + (r[USAGE_LOG_FIELDS.CALLS] || 0), 0);
    const distinctDays = new Set(rows.map((r) => r[USAGE_LOG_FIELDS.DATE])).size;

    res.status(200).json({
      windowDays: USAGE_SUMMARY_WINDOW_DAYS,
      distinctDays,
      totalCalls,
      byVolunteer: rankedTotals(rows, USAGE_LOG_FIELDS.VOLUNTEER).slice(0, 10),
      byDevice: rankedTotals(rows, USAGE_LOG_FIELDS.DEVICE).slice(0, 10),
      byEndpoint: rankedTotals(rows, USAGE_LOG_FIELDS.ENDPOINT).slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load usage summary' });
  }
}

async function handleSaveRoute(body, res) {
  const { routeId, name, streets, customLink, directionsText } = body;
  if (!name || !Array.isArray(streets) || streets.length < 2) {
    res.status(400).json({ error: 'invalid_route' });
    return;
  }
  if (customLink && !/^https?:\/\//.test(customLink)) {
    res.status(400).json({ error: 'invalid_link' });
    return;
  }

  try {
    const link = customLink || buildGoogleMapsLink(streets);
    const fields = {
      [ROUTE_FIELDS.NAME]: name,
      [ROUTE_FIELDS.STREETS_LIST]: streets.join('\n'),
      [ROUTE_FIELDS.LINK]: link,
      [ROUTE_FIELDS.DIRECTIONS_TEXT]: directionsText || '',
    };

    let record;
    if (routeId) {
      record = await updateRecord(TABLES.PATROL_ROUTES, routeId, fields);
    } else {
      record = await createRecord(TABLES.PATROL_ROUTES, fields);
    }

    res.status(200).json({ ok: true, route: { id: record.id, name, streets, link, directionsText: directionsText || '' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'save_failed' });
  }
}

async function handler(req, res) {
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
    case 'list-routes':
      await handleListRoutes(body, res);
      return;
    case 'save-route':
      await handleSaveRoute(body, res);
      return;
    case 'usage-summary':
      await handleUsageSummary(body, res);
      return;
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}

export default wrapHandler('coordinator', handler);
