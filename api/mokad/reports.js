import { listRecords } from '../_lib/airtable.js';
import { verifyMokad } from '../_lib/mokad-auth.js';
import {
  TABLES,
  HADAR_REPORT_FIELDS,
  REPORT_CATEGORY_FIELDS,
  VOLUNTEER_FIELDS,
} from '../_lib/fields.js';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { volunteerId, password } = req.query || {};
  const mokadan = await verifyMokad(volunteerId, password);
  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  try {
    const [reports, categories, volunteers] = await Promise.all([
      listRecords(TABLES.HADAR_NEW_REPORT, {
        sort: [{ field: HADAR_REPORT_FIELDS.REPORTED_AT, direction: 'desc' }],
      }),
      listRecords(TABLES.REPORT_CATEGORIES, { fields: [REPORT_CATEGORY_FIELDS.NAME] }),
      listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] }),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.fields[REPORT_CATEGORY_FIELDS.NAME] || ''])
    );
    const volunteerNameById = new Map(
      volunteers.map((v) => [v.id, v.fields[VOLUNTEER_FIELDS.NAME] || ''])
    );

    const result = reports.map((r) => {
      const f = r.fields;
      const categoryId = f[HADAR_REPORT_FIELDS.CATEGORY]?.[0];
      const reporterVolunteerId = f[HADAR_REPORT_FIELDS.REPORTER]?.[0];
      const photo = f[HADAR_REPORT_FIELDS.MAIN_PHOTO]?.[0];
      const patrolLinks = f[HADAR_REPORT_FIELDS.VERIFYING_PATROL] || [];
      const reportedAt = f[HADAR_REPORT_FIELDS.REPORTED_AT] || null;

      return {
        id: r.id,
        reportedAt,
        daysSinceReport: daysSince(reportedAt),
        category: categoryId ? categoryNameById.get(categoryId) || '' : '',
        subcategory: f[HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY] || '',
        address: f[HADAR_REPORT_FIELDS.DISPLAYED_ADDRESS] || '',
        houseNumber: f[HADAR_REPORT_FIELDS.HOUSE_NUMBER] || null,
        description: f[HADAR_REPORT_FIELDS.DESCRIPTION] || '',
        photoUrl: photo?.thumbnails?.large?.url || photo?.url || null,
        reporterName: reporterVolunteerId
          ? volunteerNameById.get(reporterVolunteerId) || ''
          : f[HADAR_REPORT_FIELDS.REPORTER_NAME_TEXT] || '',
        phone: f[HADAR_REPORT_FIELDS.PHONE] || '',
        status: f[HADAR_REPORT_FIELDS.STATUS] || '',
        urgency: f[HADAR_REPORT_FIELDS.URGENCY] || '',
        requiresVisit: !!f[HADAR_REPORT_FIELDS.REQUIRES_VISIT],
        hasVerifyingPatrol: patrolLinks.length > 0,
      };
    });

    res.status(200).json({ reports: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
}
