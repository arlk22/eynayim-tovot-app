import { listRecords } from '../_lib/airtable.js';
import {
  TABLES,
  HADAR_REPORT_FIELDS,
  REPORT_CATEGORY_FIELDS,
  HADAR_REPORT_STATUS,
  HADAR_REPORT_TYPE,
  STREET_FIELDS,
} from '../_lib/fields.js';

const TREND_MONTHS = 12;

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Public, unauthenticated endpoint — must only ever return aggregate counts,
// never individual report fields (no names, phones, exact addresses/house
// numbers, photos, or reporter identities). Location is aggregated by
// street name only, never full address — matches the "don't let residents
// pinpoint a specific building" requirement structurally, not just in the UI.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const [reports, categories, streets] = await Promise.all([
      listRecords(TABLES.HADAR_NEW_REPORT, {
        fields: [
          HADAR_REPORT_FIELDS.STATUS,
          HADAR_REPORT_FIELDS.CATEGORY,
          HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY,
          HADAR_REPORT_FIELDS.REPORT_TYPE,
          HADAR_REPORT_FIELDS.REPORTED_AT,
          HADAR_REPORT_FIELDS.STREET,
        ],
      }),
      listRecords(TABLES.REPORT_CATEGORIES, { fields: [REPORT_CATEGORY_FIELDS.NAME] }),
      listRecords(TABLES.STREETS, { fields: [STREET_FIELDS.NAME] }),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.fields[REPORT_CATEGORY_FIELDS.NAME] || ''])
    );
    const streetNameById = new Map(streets.map((s) => [s.id, s.fields[STREET_FIELDS.NAME] || '']));

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

    // Trend: reports filed per month over the last year, and how many of
    // those are closed as of today (not "closed in that month" — Airtable
    // has no closed-date field — but still a fair read on backlog by cohort).
    const byReportType = { [HADAR_REPORT_TYPE.IDENTIFIED]: 0, [HADAR_REPORT_TYPE.ANONYMOUS]: 0 };
    const monthTotals = new Map();
    const leadingIssues = new Map(); // subcategory -> { category, open, closed }
    const streetCategoryCounts = new Map(); // "streetId|category" -> { street, category, open, closed }

    for (const r of reports) {
      const f = r.fields;
      const status = f[HADAR_REPORT_FIELDS.STATUS];
      const isClosed = status === HADAR_REPORT_STATUS.CLOSED;
      const reportType = f[HADAR_REPORT_FIELDS.REPORT_TYPE];
      if (reportType && byReportType[reportType] !== undefined) byReportType[reportType] += 1;

      const mKey = monthKey(f[HADAR_REPORT_FIELDS.REPORTED_AT]);
      if (mKey) {
        const entry = monthTotals.get(mKey) || { month: mKey, total: 0, closed: 0 };
        entry.total += 1;
        if (isClosed) entry.closed += 1;
        monthTotals.set(mKey, entry);
      }

      const categoryId = f[HADAR_REPORT_FIELDS.CATEGORY]?.[0];
      const categoryName = categoryId ? categoryNameById.get(categoryId) || '' : '';
      const subcategory = f[HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY] || categoryName;
      if (subcategory) {
        const entry = leadingIssues.get(subcategory) || { subcategory, category: categoryName, open: 0, closed: 0 };
        if (isClosed) entry.closed += 1;
        else entry.open += 1;
        leadingIssues.set(subcategory, entry);
      }

      const streetId = f[HADAR_REPORT_FIELDS.STREET]?.[0];
      const streetName = streetId ? streetNameById.get(streetId) : null;
      if (streetName && categoryName) {
        const key = `${streetId}|${categoryName}`;
        const entry = streetCategoryCounts.get(key) || { street: streetName, category: categoryName, open: 0, closed: 0 };
        if (isClosed) entry.closed += 1;
        else entry.open += 1;
        streetCategoryCounts.set(key, entry);
      }
    }

    const byMonth = [...monthTotals.values()]
      .sort((a, b) => (a.month < b.month ? -1 : 1))
      .slice(-TREND_MONTHS);

    const leadingIssuesList = [...leadingIssues.values()]
      .map((e) => ({ ...e, total: e.open + e.closed }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const byStreetCategory = [...streetCategoryCounts.values()];

    res.status(200).json({
      totalReports,
      byStatus,
      byCategory,
      resolvedPercent,
      byReportType,
      byMonth,
      leadingIssues: leadingIssuesList,
      byStreetCategory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load public stats' });
  }
}
