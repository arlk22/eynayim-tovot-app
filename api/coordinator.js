import { listRecords, updateRecord, createRecord, getRecord, deleteRecord } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import { verifyCoordinator } from './_lib/coordinator-auth.js';
import { verifyPatrolLeader, namesMatch } from './_lib/patrol-leader-auth.js';
import {
  TABLES,
  VOLUNTEER_FIELDS,
  PATROL_FIELDS,
  PATROL_STATUS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
  EVENT_FIELDS,
  EVENT_STATUS,
  ROUTE_FIELDS,
  USAGE_LOG_FIELDS,
  STREET_FIELDS,
} from './_lib/fields.js';

const USAGE_SUMMARY_WINDOW_DAYS = 30;

function buildGoogleMapsLink(streets) {
  const points = streets.map((s) => encodeURIComponent(`${s.trim()}, חיפה`));
  return `https://www.google.com/maps/dir/${points.join('/')}`;
}

function tomorrowDateString() {
  // Local date parts, not toISOString (UTC) — avoids an off-by-one shift
  // depending on server timezone/time of day. Same approach as reminders.js.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

async function handleTomorrowRegistrations(body, res) {
  const tomorrow = tomorrowDateString();

  try {
    const patrols = await listRecords(TABLES.PATROLS, {
      filterByFormula: `IS_SAME({${PATROL_FIELDS.DATE}}, '${tomorrow}', 'day')`,
    });

    if (patrols.length === 0) {
      res.status(200).json({ patrols: [] });
      return;
    }

    const patrolIds = new Set(patrols.map((p) => p.id));

    // Same JS-side matching as elsewhere in this codebase — ARRAYJOIN on a
    // link field resolves to the linked record's primary-field text, not
    // its ID, so FIND/ARRAYJOIN can't filter by record ID in a formula.
    const [registrations, volunteers, routes] = await Promise.all([
      listRecords(TABLES.REGISTRATIONS, {
        filterByFormula: `{${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.REGISTERED}'`,
      }),
      listRecords(TABLES.VOLUNTEERS, {
        fields: [VOLUNTEER_FIELDS.NAME, VOLUNTEER_FIELDS.PHONE],
      }),
      listRecords(TABLES.PATROL_ROUTES, { fields: [ROUTE_FIELDS.NAME] }),
    ]);

    const volunteerById = new Map(volunteers.map((v) => [v.id, v.fields]));
    const routeNameById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.NAME] || '']));

    const result = patrols
      .filter((p) => patrolIds.has(p.id))
      .map((p) => {
        const f = p.fields;
        const routeId = f[PATROL_FIELDS.ROUTE]?.[0];
        const registrants = registrations
          .filter((r) => (r.fields[REGISTRATION_FIELDS.PATROLS] || []).includes(p.id))
          .map((r) => {
            const volId = r.fields[REGISTRATION_FIELDS.VOLUNTEER]?.[0];
            const vf = volId ? volunteerById.get(volId) : null;
            return volId
              ? {
                  id: volId,
                  name: vf?.[VOLUNTEER_FIELDS.NAME] || '',
                  phone: vf?.[VOLUNTEER_FIELDS.PHONE] || '',
                }
              : null;
          })
          .filter(Boolean);

        return {
          id: p.id,
          date: f[PATROL_FIELDS.DATE] || null,
          startTime: f[PATROL_FIELDS.START_TIME] || null,
          routeName: routeId ? routeNameById.get(routeId) || null : null,
          registrants,
        };
      })
      .filter((p) => p.registrants.length > 0);

    res.status(200).json({ patrols: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load tomorrow registrations' });
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

async function handleListStreets(body, res) {
  try {
    const streets = await listRecords(TABLES.STREETS, {
      fields: [STREET_FIELDS.NAME, STREET_FIELDS.ZONE],
      sort: [{ field: STREET_FIELDS.NAME, direction: 'asc' }],
    });

    const result = streets.map((s) => ({
      id: s.id,
      name: s.fields[STREET_FIELDS.NAME] || '',
      zones: s.fields[STREET_FIELDS.ZONE] || [],
    }));

    res.status(200).json({ streets: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load streets' });
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

async function handleMyLedPatrols(volunteerId, res) {
  if (!volunteerId) {
    res.status(400).json({ error: 'missing_volunteer' });
    return;
  }

  try {
    const volunteer = await getRecord(TABLES.VOLUNTEERS, volunteerId);
    const volunteerName = volunteer.fields[VOLUNTEER_FIELDS.NAME];

    const [patrols, routes] = await Promise.all([
      listRecords(TABLES.PATROLS, {
        filterByFormula: `IS_AFTER({${PATROL_FIELDS.DATE}}, DATEADD(TODAY(), -1, 'days'))`,
        sort: [{ field: PATROL_FIELDS.DATE, direction: 'asc' }],
      }),
      listRecords(TABLES.PATROL_ROUTES, {
        fields: [ROUTE_FIELDS.NAME, ROUTE_FIELDS.DIRECTIONS_TEXT, ROUTE_FIELDS.ZONE],
      }),
    ]);

    const routeById = new Map(routes.map((r) => [r.id, r.fields]));

    const mine = patrols
      .filter((p) => namesMatch(volunteerName, p.fields[PATROL_FIELDS.LEADER]))
      .map((p) => {
        const routeId = p.fields[PATROL_FIELDS.ROUTE]?.[0] || null;
        const route = routeId ? routeById.get(routeId) : null;
        return {
          patrolId: p.id,
          date: p.fields[PATROL_FIELDS.DATE] || null,
          dayOfWeek: p.fields[PATROL_FIELDS.DAY_OF_WEEK] || null,
          startTime: p.fields[PATROL_FIELDS.START_TIME] || null,
          routeId,
          routeName: route?.[ROUTE_FIELDS.NAME] || '',
          directionsText: route?.[ROUTE_FIELDS.DIRECTIONS_TEXT] || '',
          zone: route?.[ROUTE_FIELDS.ZONE] || '',
        };
      });

    res.status(200).json({ patrols: mine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load led patrols' });
  }
}

// Deliberately lightweight: a patrol leader just writes the street names and
// walking direction as free text (same "הוראות הליכה בטקסט" field the full
// route builder uses) — not the structured zone-picker street list, which
// stays a רכז/מנהל tool.
async function handleSaveOwnRoute(leaderAuth, body, res) {
  const { patrolId, directionsText, zone } = body;
  const text = (directionsText || '').trim();
  if (!text) {
    res.status(400).json({ error: 'invalid_directions' });
    return;
  }
  if (!zone || !['1', '2', '3', '4'].includes(zone)) {
    res.status(400).json({ error: 'invalid_zone' });
    return;
  }

  try {
    const existingRouteId = leaderAuth.patrol.fields[PATROL_FIELDS.ROUTE]?.[0] || null;
    let record;
    if (existingRouteId) {
      record = await updateRecord(TABLES.PATROL_ROUTES, existingRouteId, {
        [ROUTE_FIELDS.DIRECTIONS_TEXT]: text,
        [ROUTE_FIELDS.ZONE]: zone,
      });
    } else {
      const leaderName = leaderAuth.volunteer.fields[VOLUNTEER_FIELDS.NAME] || '';
      const patrolDate = leaderAuth.patrol.fields[PATROL_FIELDS.DATE] || '';
      record = await createRecord(TABLES.PATROL_ROUTES, {
        [ROUTE_FIELDS.NAME]: `מסלול ${leaderName} ${patrolDate}`.trim(),
        [ROUTE_FIELDS.DIRECTIONS_TEXT]: text,
        [ROUTE_FIELDS.ZONE]: zone,
      });
      await updateRecord(TABLES.PATROLS, patrolId, { [PATROL_FIELDS.ROUTE]: [record.id] });
    }

    res.status(200).json({ ok: true, directionsText: text, zone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'save_failed' });
  }
}

async function handleListPatrols(body, res) {
  const { month } = body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'invalid_month' });
    return;
  }

  try {
    const [patrols, routes] = await Promise.all([
      listRecords(TABLES.PATROLS, {
        filterByFormula: `DATETIME_FORMAT({${PATROL_FIELDS.DATE}}, 'YYYY-MM')='${month}'`,
        sort: [{ field: PATROL_FIELDS.DATE, direction: 'asc' }],
        cacheTtlMs: 0,
      }),
      listRecords(TABLES.PATROL_ROUTES, { fields: [ROUTE_FIELDS.NAME] }),
    ]);

    const routeNameById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.NAME] || '']));

    const result = patrols.map((p) => {
      const f = p.fields;
      const routeId = f[PATROL_FIELDS.ROUTE]?.[0] || null;
      return {
        id: p.id,
        date: f[PATROL_FIELDS.DATE] || null,
        dayOfWeek: f[PATROL_FIELDS.DAY_OF_WEEK] || null,
        startTime: f[PATROL_FIELDS.START_TIME] || '',
        endTime: f[PATROL_FIELDS.END_TIME] || '',
        leader: f[PATROL_FIELDS.LEADER] || '',
        maxParticipants: f[PATROL_FIELDS.MAX_PARTICIPANTS] ?? null,
        registeredCount: f[PATROL_FIELDS.REGISTERED_COUNT] || 0,
        status: f[PATROL_FIELDS.STATUS] || '',
        notes: f[PATROL_FIELDS.NOTES] || '',
        routeId,
        routeName: routeId ? routeNameById.get(routeId) || '' : '',
      };
    });

    res.status(200).json({ patrols: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load patrols' });
  }
}

async function handleSavePatrol(body, res) {
  const { patrolId, date, startTime, endTime, leader, maxParticipants, status, notes, routeId } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }
  if (status && !Object.values(PATROL_STATUS).includes(status)) {
    res.status(400).json({ error: 'invalid_status' });
    return;
  }

  try {
    const fields = {
      [PATROL_FIELDS.DATE]: date,
      [PATROL_FIELDS.START_TIME]: startTime || '',
      [PATROL_FIELDS.END_TIME]: endTime || '',
      [PATROL_FIELDS.LEADER]: leader || '',
      [PATROL_FIELDS.MAX_PARTICIPANTS]: maxParticipants ? Number(maxParticipants) : null,
      [PATROL_FIELDS.STATUS]: status || PATROL_STATUS.OPEN,
      [PATROL_FIELDS.NOTES]: notes || '',
      [PATROL_FIELDS.ROUTE]: routeId ? [routeId] : [],
    };

    let record;
    if (patrolId) {
      record = await updateRecord(TABLES.PATROLS, patrolId, fields);
    } else {
      record = await createRecord(TABLES.PATROLS, fields);
    }

    res.status(200).json({ ok: true, id: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'save_failed' });
  }
}

async function handleDeletePatrol(body, res) {
  const { patrolId } = body;
  if (!patrolId) {
    res.status(400).json({ error: 'missing_patrol' });
    return;
  }

  try {
    const patrol = await getRecord(TABLES.PATROLS, patrolId, { cacheTtlMs: 0 });
    const registeredCount = patrol.fields[PATROL_FIELDS.REGISTERED_COUNT] || 0;
    if (registeredCount > 0) {
      res.status(400).json({ error: 'has_registrations' });
      return;
    }
    await deleteRecord(TABLES.PATROLS, patrolId);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'delete_failed' });
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const { action, volunteerId, password, patrolId } = body;

  // These three actions are for regular volunteers (phone login only, no
  // coordinator password) — "list-streets" is non-sensitive reference data,
  // "my-led-patrols" just needs a real volunteer identity, and
  // "save-own-route" is scoped by verifyPatrolLeader to only the one patrol
  // this volunteer is genuinely listed as leading.
  if (action === 'list-streets') {
    await handleListStreets(body, res);
    return;
  }
  if (action === 'my-led-patrols') {
    await handleMyLedPatrols(volunteerId, res);
    return;
  }
  if (action === 'save-own-route') {
    const leaderAuth = await verifyPatrolLeader(volunteerId, patrolId);
    if (!leaderAuth) {
      res.status(401).json({ error: 'not_patrol_leader' });
      return;
    }
    await handleSaveOwnRoute(leaderAuth, body, res);
    return;
  }

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
    case 'tomorrow-registrations':
      await handleTomorrowRegistrations(body, res);
      return;
    case 'list-routes':
      await handleListRoutes(body, res);
      return;
    case 'list-streets':
      await handleListStreets(body, res);
      return;
    case 'save-route':
      await handleSaveRoute(body, res);
      return;
    case 'usage-summary':
      await handleUsageSummary(body, res);
      return;
    case 'list-patrols':
      await handleListPatrols(body, res);
      return;
    case 'save-patrol':
      await handleSavePatrol(body, res);
      return;
    case 'delete-patrol':
      await handleDeletePatrol(body, res);
      return;
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}

export default wrapHandler('coordinator', handler);
