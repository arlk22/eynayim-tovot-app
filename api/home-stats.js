import { listRecords, getRecord } from './_lib/airtable.js';
import {
  TABLES,
  VOLUNTEER_FIELDS,
  VOLUNTEER_STATUS,
  PATROL_FIELDS,
  PATROL_STATUS,
  ROUTE_FIELDS,
  ANNOUNCEMENT_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
} from './_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId } = req.query || {};

  try {
    const [volunteers, patrols, announcements] = await Promise.all([
      listRecords(TABLES.VOLUNTEERS, {
        filterByFormula: `{${VOLUNTEER_FIELDS.STATUS}}='${VOLUNTEER_STATUS.ACTIVE}'`,
        fields: [VOLUNTEER_FIELDS.STATUS],
      }),
      listRecords(TABLES.PATROLS, {
        filterByFormula: `AND(IS_AFTER({${PATROL_FIELDS.DATE}}, DATEADD(TODAY(), -1, 'days')), {${PATROL_FIELDS.STATUS}}='${PATROL_STATUS.OPEN}')`,
        sort: [{ field: PATROL_FIELDS.DATE, direction: 'asc' }],
        maxRecords: 1,
        fields: [PATROL_FIELDS.DATE, PATROL_FIELDS.START_TIME, PATROL_FIELDS.END_TIME, PATROL_FIELDS.ROUTE],
      }),
      listRecords(TABLES.ANNOUNCEMENTS, {
        filterByFormula: `AND({${ANNOUNCEMENT_FIELDS.ACTIVE}}, OR({${ANNOUNCEMENT_FIELDS.EXPIRY}}=BLANK(), NOT(IS_BEFORE({${ANNOUNCEMENT_FIELDS.EXPIRY}}, TODAY()))))`,
        sort: [
          { field: ANNOUNCEMENT_FIELDS.PINNED, direction: 'desc' },
          { field: ANNOUNCEMENT_FIELDS.CREATED_AT, direction: 'desc' },
        ],
      }),
    ]);

    let nextPatrol = null;
    if (patrols.length > 0) {
      const p = patrols[0].fields;
      let routeName = null;
      const routeId = p[PATROL_FIELDS.ROUTE]?.[0];
      if (routeId) {
        const route = await getRecord(TABLES.PATROL_ROUTES, routeId);
        routeName = route.fields[ROUTE_FIELDS.NAME] || null;
      }
      let isMine = false;
      if (volunteerId) {
        // Linked-record IDs can't be matched via FIND/ARRAYJOIN in a formula
        // (it resolves to the linked record's primary-field text, not its
        // ID) — filter on status only, match IDs in JS.
        const registered = await listRecords(TABLES.REGISTRATIONS, {
          filterByFormula: `{${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.REGISTERED}'`,
          fields: [REGISTRATION_FIELDS.VOLUNTEER, REGISTRATION_FIELDS.PATROLS],
        });
        isMine = registered.some(
          (r) =>
            (r.fields[REGISTRATION_FIELDS.VOLUNTEER] || []).includes(volunteerId) &&
            (r.fields[REGISTRATION_FIELDS.PATROLS] || []).includes(patrols[0].id)
        );
      }

      nextPatrol = {
        date: p[PATROL_FIELDS.DATE] || null,
        startTime: p[PATROL_FIELDS.START_TIME] || null,
        endTime: p[PATROL_FIELDS.END_TIME] || null,
        routeName,
        isMine,
      };
    }

    res.status(200).json({
      activeVolunteerCount: volunteers.length,
      nextPatrol,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.fields[ANNOUNCEMENT_FIELDS.TITLE] || '',
        content: a.fields[ANNOUNCEMENT_FIELDS.CONTENT] || '',
        type: a.fields[ANNOUNCEMENT_FIELDS.TYPE] || '',
        pinned: !!a.fields[ANNOUNCEMENT_FIELDS.PINNED],
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load home stats' });
  }
}
