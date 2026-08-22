import { listRecords } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import {
  TABLES,
  PATROL_FIELDS,
  PATROL_STATUS,
  ROUTE_FIELDS,
  REGISTRATION_FIELDS,
  REGISTRATION_STATUS,
  VOLUNTEER_FIELDS,
  STREET_FIELDS,
} from './_lib/fields.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const month = req.query?.month; // 'YYYY-MM'
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'invalid_month' });
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const [patrols, routes, registrations, volunteers, streets] = await Promise.all([
      listRecords(TABLES.PATROLS, {
        filterByFormula: `AND(DATETIME_FORMAT({${PATROL_FIELDS.DATE}}, 'YYYY-MM')='${month}', NOT({${PATROL_FIELDS.STATUS}}='${PATROL_STATUS.DRAFT}'))`,
        sort: [{ field: PATROL_FIELDS.DATE, direction: 'asc' }],
      }),
      listRecords(TABLES.PATROL_ROUTES, {
        fields: [ROUTE_FIELDS.NAME, ROUTE_FIELDS.LINK, ROUTE_FIELDS.DIRECTIONS_TEXT, ROUTE_FIELDS.STREETS_LIST, ROUTE_FIELDS.ZONE],
      }),
      listRecords(TABLES.REGISTRATIONS, {
        filterByFormula: `{${REGISTRATION_FIELDS.STATUS}}='${REGISTRATION_STATUS.REGISTERED}'`,
        fields: [REGISTRATION_FIELDS.PATROLS, REGISTRATION_FIELDS.VOLUNTEER],
      }),
      listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] }),
      listRecords(TABLES.STREETS, { fields: [STREET_FIELDS.NAME, STREET_FIELDS.ZONE] }),
    ]);

    const routeNameById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.NAME] || '']));
    const routeLinkById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.LINK] || '']));
    const routeDirectionsById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.DIRECTIONS_TEXT] || '']));
    const routeStreetsById = new Map(
      routes.map((r) => [
        r.id,
        (r.fields[ROUTE_FIELDS.STREETS_LIST] || '').split('\n').filter(Boolean),
      ])
    );
    const routeZoneById = new Map(routes.map((r) => [r.id, r.fields[ROUTE_FIELDS.ZONE] || null]));
    const volunteerNameById = new Map(volunteers.map((v) => [v.id, v.fields[VOLUNTEER_FIELDS.NAME] || '']));
    const zonesByStreetName = new Map(
      streets.map((s) => [s.fields[STREET_FIELDS.NAME], s.fields[STREET_FIELDS.ZONE] || []])
    );
    // Reverse of zonesByStreetName — used as a fallback when a route has no
    // explicit street list (e.g. a patrol leader's free-text-only route):
    // show every street tagged with the route's assigned zone instead of
    // nothing at all. Not an ordered walking path, just area orientation.
    const streetNamesByZone = new Map();
    for (const s of streets) {
      const name = s.fields[STREET_FIELDS.NAME];
      for (const zone of s.fields[STREET_FIELDS.ZONE] || []) {
        if (!streetNamesByZone.has(zone)) streetNamesByZone.set(zone, []);
        streetNamesByZone.get(zone).push(name);
      }
    }
    for (const list of streetNamesByZone.values()) list.sort((a, b) => a.localeCompare(b, 'he'));

    const registrationsByPatrolId = new Map();
    for (const reg of registrations) {
      const patrolId = reg.fields[REGISTRATION_FIELDS.PATROLS]?.[0];
      const volunteerId = reg.fields[REGISTRATION_FIELDS.VOLUNTEER]?.[0];
      if (!patrolId || !volunteerId) continue;
      if (!registrationsByPatrolId.has(patrolId)) registrationsByPatrolId.set(patrolId, []);
      registrationsByPatrolId.get(patrolId).push({
        id: volunteerId,
        name: volunteerNameById.get(volunteerId) || '',
      });
    }

    const result = patrols.map((p) => {
      const f = p.fields;
      const routeId = f[PATROL_FIELDS.ROUTE]?.[0];
      const routeStreets = routeId ? routeStreetsById.get(routeId) || [] : [];
      // A route's "zone" isn't stored directly — it's derived from the zones
      // of its own streets, since a route can legitimately cross more than one.
      let routeZones = [...new Set(routeStreets.flatMap((name) => zonesByStreetName.get(name) || []))].sort();
      let zoneStreets = [];
      if (routeStreets.length === 0 && routeId) {
        const manualZone = routeZoneById.get(routeId);
        if (manualZone) {
          routeZones = [manualZone];
          zoneStreets = streetNamesByZone.get(manualZone) || [];
        }
      }
      return {
        id: p.id,
        date: f[PATROL_FIELDS.DATE] || null,
        dayOfWeek: f[PATROL_FIELDS.DAY_OF_WEEK] || null,
        startTime: f[PATROL_FIELDS.START_TIME] || null,
        endTime: f[PATROL_FIELDS.END_TIME] || null,
        routeName: routeId ? routeNameById.get(routeId) || null : null,
        routeLink: routeId ? routeLinkById.get(routeId) || null : null,
        routeDirections: routeId ? routeDirectionsById.get(routeId) || null : null,
        routeStreets,
        routeZones,
        zoneStreets,
        leader: f[PATROL_FIELDS.LEADER] || null,
        maxParticipants: f[PATROL_FIELDS.MAX_PARTICIPANTS] ?? null,
        spotsLeft: f[PATROL_FIELDS.SPOTS_LEFT] ?? null,
        status: f[PATROL_FIELDS.STATUS] || null,
        joined: registrationsByPatrolId.get(p.id) || [],
      };
    });

    res.status(200).json({ patrols: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load patrols' });
  }
}

export default wrapHandler('patrols', handler);
