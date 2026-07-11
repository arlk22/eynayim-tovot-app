import { listRecords } from '../_lib/airtable.js';
import { TABLES, HADAR_REPORT_FIELDS, REPORT_CATEGORY_FIELDS, HADAR_REPORT_STATUS } from '../_lib/fields.js';

// Public, unauthenticated endpoint — must only ever return aggregate counts,
// never individual report fields (no names, phones, addresses, photos).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const [reports, categories] = await Promise.all([
      listRecords(TABLES.HADAR_NEW_REPORT, {
        fields: [HADAR_REPORT_FIELDS.STATUS, HADAR_REPORT_FIELDS.CATEGORY],
      }),
      listRecords(TABLES.REPORT_CATEGORIES, { fields: [REPORT_CATEGORY_FIELDS.NAME] }),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.fields[REPORT_CATEGORY_FIELDS.NAME] || ''])
    );

    const byStatus = {
      [HADAR_REPORT_STATUS.NEW]: 0,
      [HADAR_REPORT_STATUS.VERIFIED]: 0,
      [HADAR_REPORT_STATUS.IN_TREATMENT]: 0,
      [HADAR_REPORT_STATUS.CLOSED]: 0,
    };
    const categoryCounts = new Map();

    for (const r of reports) {
      const status = r.fields[HADAR_REPORT_FIELDS.STATUS];
      if (status && byStatus[status] !== undefined) byStatus[status] += 1;

      const categoryId = r.fields[HADAR_REPORT_FIELDS.CATEGORY]?.[0];
      const categoryName = categoryId ? categoryNameById.get(categoryId) : null;
      if (categoryName) {
        categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
      }
    }

    const byCategory = [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalReports = reports.length;
    const resolvedPercent = totalReports
      ? Math.round((byStatus[HADAR_REPORT_STATUS.CLOSED] / totalReports) * 100)
      : 0;

    res.status(200).json({
      totalReports,
      byStatus,
      byCategory,
      resolvedPercent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load public stats' });
  }
}
