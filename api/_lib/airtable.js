const API_ROOT = 'https://api.airtable.com/v0';

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${method} ${table} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listRecords(table, { filterByFormula, sort, maxRecords, fields } = {}) {
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
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable list ${table} failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function createRecord(table, fields) {
  const data = await request(table, { method: 'POST', body: { fields } });
  return data;
}

export async function updateRecord(table, recordId, fields) {
  const data = await request(table, { method: 'PATCH', path: `/${recordId}`, body: { fields } });
  return data;
}

export async function getRecord(table, recordId) {
  const data = await request(table, { path: `/${recordId}` });
  return data;
}
