import { getRealCallCount, listRecords, createRecords } from './airtable.js';
import { TABLES, VOLUNTEER_FIELDS, USAGE_LOG_FIELDS } from './fields.js';

// Attributes real Airtable API calls to a volunteer + rough device, so we
// can answer "who/what is driving the quota usage" after the fact. Buckets
// live in memory per warm serverless instance and get flushed to the "API
// Usage Log" table in small daily batches — cheap enough that the tracking
// itself is a negligible fraction of the quota it's measuring. A cold start
// loses whatever hadn't been flushed yet; that's an accepted tradeoff for
// not needing a cron job or external store.
const FLUSH_INTERVAL_MS = 15 * 60 * 1000;
const buckets = new Map();
let lastFlushAt = Date.now();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseDevice(userAgent) {
  const ua = userAgent || '';
  let os = 'לא ידוע';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'לא ידוע';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/CriOS/i.test(ua) || /Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return `${os} / ${browser}`;
}

function extractVolunteerId(req) {
  return (req.query && req.query.volunteerId) || (req.body && req.body.volunteerId) || null;
}

function recordUsage({ endpoint, volunteerId, device, calls }) {
  if (calls <= 0) return;
  const key = `${todayKey()}|${volunteerId || 'anonymous'}|${device}|${endpoint}`;
  buckets.set(key, (buckets.get(key) || 0) + calls);
}

async function resolveVolunteerNames(ids) {
  const namesById = new Map();
  const realIds = ids.filter((id) => id && id !== 'anonymous');
  if (realIds.length === 0) return namesById;
  try {
    const volunteers = await listRecords(TABLES.VOLUNTEERS, { fields: [VOLUNTEER_FIELDS.NAME] });
    for (const v of volunteers) {
      namesById.set(v.id, v.fields[VOLUNTEER_FIELDS.NAME] || v.id);
    }
  } catch (err) {
    console.error('usage-tracker: failed to resolve volunteer names', err);
  }
  return namesById;
}

async function flushNow() {
  if (buckets.size === 0) {
    lastFlushAt = Date.now();
    return;
  }
  const entries = [...buckets.entries()];
  buckets.clear();
  lastFlushAt = Date.now();

  const volunteerIds = [...new Set(entries.map(([key]) => key.split('|')[1]))];
  const namesById = await resolveVolunteerNames(volunteerIds);

  const rows = entries.map(([key, calls]) => {
    const [date, volunteerId, device, endpoint] = key.split('|');
    const volunteerLabel =
      volunteerId === 'anonymous' ? 'אנונימי' : namesById.get(volunteerId) || volunteerId;
    return {
      [USAGE_LOG_FIELDS.DATE]: date,
      [USAGE_LOG_FIELDS.VOLUNTEER]: volunteerLabel,
      [USAGE_LOG_FIELDS.DEVICE]: device,
      [USAGE_LOG_FIELDS.ENDPOINT]: endpoint,
      [USAGE_LOG_FIELDS.CALLS]: calls,
    };
  });

  try {
    await createRecords(TABLES.USAGE_LOG, rows);
  } catch (err) {
    console.error('usage-tracker: failed to flush usage log', err);
  }
}

// Wraps an API handler so every request it serves is attributed to a
// volunteer + device bucket by however many real Airtable calls it caused.
export function wrapHandler(endpoint, handler) {
  return async function wrapped(req, res) {
    const callsBefore = getRealCallCount();
    try {
      await handler(req, res);
    } finally {
      recordUsage({
        endpoint,
        volunteerId: extractVolunteerId(req),
        device: parseDevice(req.headers?.['user-agent']),
        calls: getRealCallCount() - callsBefore,
      });
      if (Date.now() - lastFlushAt > FLUSH_INTERVAL_MS) {
        await flushNow();
      }
    }
  };
}
