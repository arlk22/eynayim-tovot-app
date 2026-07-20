const API_ROOT = 'https://api.airtable.com/v0';

// Survives only within a warm serverless instance (cleared on cold start),
// but that's enough to collapse the duplicate Airtable calls that happen
// within a burst of near-simultaneous requests — e.g. every מוקד/coordinator
// action re-verifying the same volunteer record, or several residents
// loading the home page within the same few seconds. Not a substitute for
// the CDN Cache-Control headers on the public GET endpoints, which are what
// actually avoid invoking the function at all.
const DEFAULT_TTL_MS = 20_000;
const cache = new Map();

// Counts real HTTP calls out to Airtable (cache hits don't count). Used by
// usage-tracker.js to attribute how many actual Airtable calls a request
// caused, per volunteer/device — the only way to answer "who's driving the
// quota usage" without guessing from request counts alone.
let realCallCount = 0;

export function getRealCallCount() {
  return realCallCount;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function invalidateTable(table) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${table}::`)) cache.delete(key);
  }
}

function baseId() {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new Error('AIRTABLE_BASE_ID is not set');
  return id;
}

function token() {
  const t = process.env.AIRTABLE_TOKEN;
  if (!t) throw new Error('AIRTABLE_TOKEN is not set');
  return t;
}

async function request(table, { method = 'GET', path = '', query, body } = {}) {
  const url = new URL(`${API_ROOT}/${baseId()}/${encodeURIComponent(table)}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  realCallCount += 1;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${method} ${table} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listRecords(
  table,
  { filterByFormula, sort, maxRecords, fields, cacheTtlMs = DEFAULT_TTL_MS } = {}
) {
  const cacheKey = `${table}::list::${JSON.stringify({ filterByFormula, sort, maxRecords, fields })}`;
  if (cacheTtlMs > 0) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(`${API_ROOT}/${baseId()}/${encodeURIComponent(table)}`);
  if (filterByFormula) url.searchParams.set('filterByFormula', filterByFormula);
  if (maxRecords) url.searchParams.set('maxRecords', maxRecords);
  if (sort) {
    sort.forEach((s, i) => {
      url.searchParams.set(`sort[${i}][field]`, s.field);
      url.searchParams.set(`sort[${i}][direction]`, s.direction || 'asc');
    });
  }
  if (fields) {
    fields.forEach((f) => url.searchParams.append('fields[]', f));
  }

  let records = [];
  let offset;
  do {
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    realCallCount += 1;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable list ${table} failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  if (cacheTtlMs > 0) cacheSet(cacheKey, records, cacheTtlMs);
  return records;
}

export async function createRecord(table, fields) {
  const data = await request(table, { method: 'POST', body: { fields } });
  invalidateTable(table);
  return data;
}

// Airtable accepts up to 10 records per POST — batching keeps the usage-log
// flush itself from meaningfully adding to the quota it's measuring.
export async function createRecords(table, fieldsList) {
  const created = [];
  for (let i = 0; i < fieldsList.length; i += 10) {
    const batch = fieldsList.slice(i, i + 10).map((fields) => ({ fields }));
    const data = await request(table, { method: 'POST', body: { records: batch } });
    created.push(...data.records);
  }
  invalidateTable(table);
  return created;
}

export async function updateRecord(table, recordId, fields) {
  const data = await request(table, { method: 'PATCH', path: `/${recordId}`, body: { fields } });
  invalidateTable(table);
  return data;
}

export async function getRecord(table, recordId, { cacheTtlMs = DEFAULT_TTL_MS } = {}) {
  const cacheKey = `${table}::get::${recordId}`;
  if (cacheTtlMs > 0) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const data = await request(table, { path: `/${recordId}` });
  if (cacheTtlMs > 0) cacheSet(cacheKey, data, cacheTtlMs);
  return data;
}
