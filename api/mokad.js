import { listRecords, getRecord, updateRecord, createRecord } from './_lib/airtable.js';
import { verifyMokad } from './_lib/mokad-auth.js';
import {
  TABLES,
  HADAR_REPORT_FIELDS,
  HADAR_REPORT_STATUS,
  REPORT_CATEGORY_FIELDS,
  REPORT_SUBCATEGORY_FIELDS,
  VOLUNTEER_FIELDS,
  ACTIVITY_LOG_FIELDS,
  ACTIVITY_LOG_ACTION_TYPE,
  MUNICIPALITY_RESPONSE_STATUS,
  PATROL_FIELDS,
  ROUTE_FIELDS,
  PATROL_STATUS,
} from './_lib/fields.js';

const DUPLICATE_WINDOW_DAYS = 14;

// Single consolidated endpoint for all מוקד actions (Vercel Hobby caps
// serverless functions at 12; this used to be 5 separate files).

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

async function handleReports(body, res) {
  try {
    const [reports, categories, volunteers, municipalityContacts] = await Promise.all([
      listRecords(TABLES.HADAR_NEW_REPORT, {
        sort: [{ field: HADAR_REPORT_FIELDS.REPORTED_AT, direction: 'desc' }],
      }),
      listRecords(TABLES.REPORT_CATEGORIES, { fields: [REPORT_CATEGORY_FIELDS.NAME] }),
      listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] }),
      listRecords(TABLES.ACTIVITY_LOG, {
        filterByFormula: `{${ACTIVITY_LOG_FIELDS.ACTION_TYPE}}='${ACTIVITY_LOG_ACTION_TYPE.MUNICIPALITY_CONTACT}'`,
        fields: [ACTIVITY_LOG_FIELDS.RELATED_REPORT],
      }),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.fields[REPORT_CATEGORY_FIELDS.NAME] || ''])
    );
    const volunteerNameById = new Map(
      volunteers.map((v) => [v.id, v.fields[VOLUNTEER_FIELDS.NAME] || ''])
    );
    const forwardedReportIds = new Set(
      municipalityContacts.flatMap((e) => e.fields[ACTIVITY_LOG_FIELDS.RELATED_REPORT] || [])
    );

    // Safety net for the Fillout dynamic-default-value issue: if תאריך דיווח
    // is blank, use Airtable's own record-creation timestamp instead —
    // always accurate, nothing to misconfigure on the Fillout side.
    for (const r of reports) {
      if (!r.fields[HADAR_REPORT_FIELDS.REPORTED_AT]) {
        await updateRecord(TABLES.HADAR_NEW_REPORT, r.id, {
          [HADAR_REPORT_FIELDS.REPORTED_AT]: r.createdTime,
        });
        r.fields[HADAR_REPORT_FIELDS.REPORTED_AT] = r.createdTime;
      }
    }

    // Fillout writes new reports straight into Airtable, so nothing ever
    // assigns מזהה on creation. Backfill it lazily here (this endpoint is
    // hit every time a מוקדן opens the dashboard) instead of relying on a
    // human to number reports by hand. Sorted by Airtable's own createdTime
    // (always present) rather than תאריך דיווח, since that field itself can
    // be blank on reports affected by the Fillout mapping issue — every
    // report still gets a tracking number regardless.
    const existingIds = reports
      .map((r) => r.fields[HADAR_REPORT_FIELDS.ID])
      .filter((n) => typeof n === 'number');
    let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const needsId = reports
      .filter((r) => r.fields[HADAR_REPORT_FIELDS.ID] == null)
      .sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
    for (const r of needsId) {
      await updateRecord(TABLES.HADAR_NEW_REPORT, r.id, { [HADAR_REPORT_FIELDS.ID]: nextId });
      r.fields[HADAR_REPORT_FIELDS.ID] = nextId;
      nextId++;
    }

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
        address: f[HADAR_REPORT_FIELDS.MAP_ADDRESS] || '',
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
        hasBeenForwarded: forwardedReportIds.has(r.id),
      };
    });

    res.status(200).json({ reports: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
}

async function handleReportDetail(body, res) {
  const { reportId } = body;
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

    // Only worth flagging while the report is still new — once a מוקדן has
    // moved it along, that status change itself is the "reviewed" signal.
    let possibleDuplicate = null;
    const streetId = f[HADAR_REPORT_FIELDS.STREET]?.[0] || null;
    const categoryId = f[HADAR_REPORT_FIELDS.CATEGORY]?.[0] || null;
    const reportedAt = f[HADAR_REPORT_FIELDS.REPORTED_AT];
    if (streetId && categoryId && reportedAt && f[HADAR_REPORT_FIELDS.STATUS] === HADAR_REPORT_STATUS.NEW) {
      const others = await listRecords(TABLES.HADAR_NEW_REPORT, {
        fields: [
          HADAR_REPORT_FIELDS.STREET,
          HADAR_REPORT_FIELDS.CATEGORY,
          HADAR_REPORT_FIELDS.STATUS,
          HADAR_REPORT_FIELDS.REPORTED_AT,
          HADAR_REPORT_FIELDS.MAP_ADDRESS,
        ],
      });
      const cutoff = new Date(reportedAt);
      cutoff.setDate(cutoff.getDate() - DUPLICATE_WINDOW_DAYS);
      const match = others.find((o) => {
        if (o.id === reportId) return false;
        const of = o.fields;
        if (of[HADAR_REPORT_FIELDS.STATUS] === HADAR_REPORT_STATUS.CLOSED) return false;
        if ((of[HADAR_REPORT_FIELDS.STREET]?.[0] || null) !== streetId) return false;
        if ((of[HADAR_REPORT_FIELDS.CATEGORY]?.[0] || null) !== categoryId) return false;
        const oReportedAt = of[HADAR_REPORT_FIELDS.REPORTED_AT];
        return !!oReportedAt && new Date(oReportedAt) >= cutoff;
      });
      if (match) {
        possibleDuplicate = {
          id: match.id,
          address: match.fields[HADAR_REPORT_FIELDS.MAP_ADDRESS] || '',
          reportedAt: match.fields[HADAR_REPORT_FIELDS.REPORTED_AT] || null,
        };
      }
    }

    let availableSubcategories = [];
    if (!f[HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY] && categoryId) {
      const subcategories = await listRecords(TABLES.REPORT_SUBCATEGORIES, {
        fields: [REPORT_SUBCATEGORY_FIELDS.NAME, REPORT_SUBCATEGORY_FIELDS.CATEGORY],
      });
      availableSubcategories = subcategories
        .filter((s) => (s.fields[REPORT_SUBCATEGORY_FIELDS.CATEGORY] || []).includes(categoryId))
        .map((s) => ({ id: s.id, name: s.fields[REPORT_SUBCATEGORY_FIELDS.NAME] || '' }));
    }

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
        reportNumber: f[HADAR_REPORT_FIELDS.ID] ?? null,
        reportedAt: f[HADAR_REPORT_FIELDS.REPORTED_AT] || null,
        daysSinceReport: daysSince(f[HADAR_REPORT_FIELDS.REPORTED_AT]),
        category: category?.fields?.[REPORT_CATEGORY_FIELDS.NAME] || '',
        categoryId,
        subcategory: f[HADAR_REPORT_FIELDS.SUBCATEGORY_DISPLAY] || '',
        address: f[HADAR_REPORT_FIELDS.MAP_ADDRESS] || '',
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
      availableSubcategories,
      possibleDuplicate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load report detail' });
  }
}

async function handleSetSubcategory(body, res) {
  const { reportId, subcategoryId } = body;
  if (!reportId || !subcategoryId) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    await updateRecord(TABLES.HADAR_NEW_REPORT, reportId, {
      [HADAR_REPORT_FIELDS.SUBCATEGORY]: [subcategoryId],
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'set_subcategory_failed' });
  }
}

async function handleMunicipalityFollowups(body, res) {
  try {
    const [entries, reports, categories] = await Promise.all([
      listRecords(TABLES.ACTIVITY_LOG, {
        filterByFormula: `AND({${ACTIVITY_LOG_FIELDS.ACTION_TYPE}}='${ACTIVITY_LOG_ACTION_TYPE.MUNICIPALITY_CONTACT}', OR({${ACTIVITY_LOG_FIELDS.MUNICIPALITY_RESPONSE_STATUS}}='${MUNICIPALITY_RESPONSE_STATUS.AWAITING}', {${ACTIVITY_LOG_FIELDS.MUNICIPALITY_RESPONSE_STATUS}}=BLANK()))`,
      }),
      listRecords(TABLES.HADAR_NEW_REPORT, {
        fields: [
          HADAR_REPORT_FIELDS.ID,
          HADAR_REPORT_FIELDS.CATEGORY,
          HADAR_REPORT_FIELDS.MAP_ADDRESS,
          HADAR_REPORT_FIELDS.STATUS,
        ],
      }),
      listRecords(TABLES.REPORT_CATEGORIES, { fields: [REPORT_CATEGORY_FIELDS.NAME] }),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.fields[REPORT_CATEGORY_FIELDS.NAME] || ''])
    );
    const reportById = new Map(reports.map((r) => [r.id, r.fields]));

    const followups = entries
      .map((e) => {
        const f = e.fields;
        const reportId = f[ACTIVITY_LOG_FIELDS.RELATED_REPORT]?.[0] || null;
        const report = reportId ? reportById.get(reportId) : null;
        const categoryId = report?.[HADAR_REPORT_FIELDS.CATEGORY]?.[0];
        return {
          logEntryId: e.id,
          reportId,
          reportNumber: report?.[HADAR_REPORT_FIELDS.ID] ?? null,
          category: categoryId ? categoryNameById.get(categoryId) || '' : '',
          address: report?.[HADAR_REPORT_FIELDS.MAP_ADDRESS] || '',
          reportStatus: report?.[HADAR_REPORT_FIELDS.STATUS] || '',
          forwardedTo: f[ACTIVITY_LOG_FIELDS.FORWARDED_TO] || '',
          sentAt: f[ACTIVITY_LOG_FIELDS.DATETIME] || null,
          daysSinceSent: daysSince(f[ACTIVITY_LOG_FIELDS.DATETIME]),
        };
      })
      .sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));

    res.status(200).json({ followups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load municipality followups' });
  }
}

async function handleSetMunicipalityResponse(body, res) {
  const { logEntryId, status } = body;
  if (!logEntryId || !status) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    const fields = { [ACTIVITY_LOG_FIELDS.MUNICIPALITY_RESPONSE_STATUS]: status };
    if (status !== MUNICIPALITY_RESPONSE_STATUS.AWAITING) {
      fields[ACTIVITY_LOG_FIELDS.MUNICIPALITY_RESPONSE_DATE] = new Date().toISOString().slice(0, 10);
    }
    await updateRecord(TABLES.ACTIVITY_LOG, logEntryId, fields);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'set_response_failed' });
  }
}

async function handleAttachPatrol(body, res) {
  const { reportId, patrolId, note } = body;
  if (!reportId || !patrolId) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    await updateRecord(TABLES.HADAR_NEW_REPORT, reportId, {
      [HADAR_REPORT_FIELDS.VERIFYING_PATROL]: [patrolId],
    });

    if (note) {
      const patrol = await getRecord(TABLES.PATROLS, patrolId);
      const existingNotes = patrol.fields[PATROL_FIELDS.NOTES] || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${note}` : note;
      await updateRecord(TABLES.PATROLS, patrolId, {
        [PATROL_FIELDS.NOTES]: updatedNotes,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'attach_failed' });
  }
}

async function handleAddLogEntry(body, res) {
  const { reportId, actionType, content, newStatus, volunteerId, forwardedTo } = body;
  if (!reportId || !actionType) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  try {
    const logFields = {
      [ACTIVITY_LOG_FIELDS.RELATED_REPORT]: [reportId],
      [ACTIVITY_LOG_FIELDS.ACTION_TYPE]: actionType,
      [ACTIVITY_LOG_FIELDS.CONTENT]: content || '',
      [ACTIVITY_LOG_FIELDS.VOLUNTEER]: [volunteerId],
      [ACTIVITY_LOG_FIELDS.DATETIME]: new Date().toISOString(),
    };
    if (forwardedTo) logFields[ACTIVITY_LOG_FIELDS.FORWARDED_TO] = forwardedTo;
    if (actionType === ACTIVITY_LOG_ACTION_TYPE.MUNICIPALITY_CONTACT) {
      logFields[ACTIVITY_LOG_FIELDS.MUNICIPALITY_RESPONSE_STATUS] = MUNICIPALITY_RESPONSE_STATUS.AWAITING;
    }
    const created = await createRecord(TABLES.ACTIVITY_LOG, logFields);

    if (newStatus) {
      await updateRecord(TABLES.HADAR_NEW_REPORT, reportId, {
        [HADAR_REPORT_FIELDS.STATUS]: newStatus,
      });
    }

    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'log_entry_failed' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const { action, volunteerId, password } = body;
  const mokadan = await verifyMokad(volunteerId, password);
  if (!mokadan) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  switch (action) {
    case 'auth':
      res.status(200).json({ ok: true, name: mokadan.fields[VOLUNTEER_FIELDS.NAME] || '' });
      return;
    case 'reports':
      await handleReports(body, res);
      return;
    case 'report-detail':
      await handleReportDetail(body, res);
      return;
    case 'attach-patrol':
      await handleAttachPatrol(body, res);
      return;
    case 'set-subcategory':
      await handleSetSubcategory(body, res);
      return;
    case 'municipality-followups':
      await handleMunicipalityFollowups(body, res);
      return;
    case 'set-municipality-response':
      await handleSetMunicipalityResponse(body, res);
      return;
    case 'add-log-entry':
      await handleAddLogEntry(body, res);
      return;
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
