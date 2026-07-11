import { listRecords, getRecord } from '../_lib/airtable.js';
import { verifyMokad } from '../_lib/mokad-auth.js';
import {
  TABLES,
  HADAR_REPORT_FIELDS,
  REPORT_CATEGORY_FIELDS,
  VOLUNTEER_FIELDS,
  ACTIVITY_LOG_FIELDS,
  PATROL_FIELDS,
  ROUTE_FIELDS,
  PATROL_STATUS,
} from '../_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password, reportId } = req.query || {};
  const mokadan = await verifyMokad(volunteerId, password);
  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  if (!reportId) {
    res.status(400).json({ error: 'missing_report_id' });
    return;
  }

  try {
    const report = await getRecord(TABLES.HADAR_NEW_REPORT, reportId);
    const f = report.fields;

    const [category, activityLogEntries, volunteers, patrols, routes] = await Promise.all([
      f[HADAR_REPORT_FIELDS.CATEGORY]?.[0]
        ? getRecord(TABLES.REPORT_CATEGORIES, f[HADAR_REPORT_FIELDS.CATEGORY][0])
        : null,
      listRecords(TABLES.ACTIVITY_LOG, {
        filterByFormula: `NOT({${ACTIVITY_LOG_FIELDS.RELATED_REPORT}}=BLANK())`,
      }),
      listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] }),
      listRecords(TABLES.PATROLS, {
        filterByFormula: `NOT({${PATROL_FIELDS.STATUS}}='${PATROL_STATUS.CANCELLED}')`,
        sort: [{ field: PATROL_FIELDS.DATE, direction: 'asc' }],
      }),
      listRecords(TABLES.PATROL_ROUTES, {
        fields: [ROUTE_FIELDS.NAME, ROUTE_FIELDS.AREA, ROUTE_FIELDS.DESCRIPTION],
      }),
    ]);

    const volunteerNameById = new Map(
      volunteers.map((v) => [v.id, v.fields[VOLUNTEER_FIELDS.NAME] || ''])
    );
    const routeById = new Map(routes.map((r) => [r.id, r.fields]));

    const reporterVolunteerId = f[HADAR_REPORT_FIELDS.REPORTER]?.[0];
    const photos = (f[HADAR_REPORT_FIELDS.MAIN_PHOTO] || []).map(
      (p) => p?.thumbnails?.large?.url || p?.url
    );
    const verifyingPatrolId = f[HADAR_REPORT_FIELDS.VERIFYING_PATROL]?.[0] || null;

    const log = activityLogEntries
      .filter((e) => (e.fields[ACTIVITY_LOG_FIELDS.RELATED_REPORT] || []).includes(reportId))
      .map((e) => {
        const lf = e.fields;
        const volId = lf[ACTIVITY_LOG_FIELDS.VOLUNTEER]?.[0];
        const photo = lf[ACTIVITY_LOG_FIELDS.TRACKING_PHOTO]?.[0];
        return {
          id: e.id,
          datetime: lf[ACTIVITY_LOG_FIELDS.DATETIME] || null,
          actionType: lf[ACTIVITY_LOG_FIELDS.ACTION_TYPE] || '',
          content: lf[ACTIVITY_LOG_FIELDS.CONTENT] || '',
          volunteerName: volId ? volunteerNameById.get(volId) || '' : '',
          photoUrl: photo?.thumbnails?.large?.url || photo?.url || null,
        };
      })
      .sort((a, b) => new Date(b.datetime || 0) - new Date(a.datetime || 0));

    const availablePatrols = patrols.map((p) => {
      const pf = p.fields;
      const routeId = pf[PATROL_FIELDS.ROUTE]?.[0];
      const route = routeId ? routeById.get(routeId) : null;
      return {
        id: p.id,
        date: pf[PATROL_FIELDS.DATE] || null,
        startTime: pf[PATROL_FIELDS.START_TIME] || null,
        routeName: route?.[ROUTE_FIELDS.NAME] || null,
        routeArea: route?.[ROUTE_FIELDS.AREA] || null,
        routeDescription: route?.[ROUTE_FIELDS.DESCRIPTION] || null,
        isCurrentlyAttached: p.id === verifyingPatrolId,
      };
    });

    res.status(200).json({
      report: {
        id: report.id,
        reportedAt: f[HADAR_REPORT_FIELDS.REPORTED_AT] || null,
        category: category?.fields?.[REPORT_CATEGORY_FIELDS.NAME] || '',
        subcategory: f[HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY] || '',
        address: f[HADAR_REPORT_FIELDS.DISPLAYED_ADDRESS] || '',
        houseNumber: f[HADAR_REPORT_FIELDS.HOUSE_NUMBER] || null,
        description: f[HADAR_REPORT_FIELDS.DESCRIPTION] || '',
        photos,
        reporterName: reporterVolunteerId
          ? volunteerNameById.get(reporterVolunteerId) || ''
          : f[HADAR_REPORT_FIELDS.REPORTER_NAME_TEXT] || '',
        phone: f[HADAR_REPORT_FIELDS.PHONE] || '',
        email: f[HADAR_REPORT_FIELDS.EMAIL] || '',
        status: f[HADAR_REPORT_FIELDS.STATUS] || '',
        urgency: f[HADAR_REPORT_FIELDS.URGENCY] || '',
        requiresVisit: !!f[HADAR_REPORT_FIELDS.REQUIRES_VISIT],
        verifyingPatrolId,
      },
      log,
      availablePatrols,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load report detail' });
  }
}
