import { listRecords } from './_lib/airtable.js';
import { TABLES, ANNOUNCEMENT_FIELDS } from './_lib/fields.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const announcements = await listRecords(TABLES.ANNOUNCEMENTS, {
      filterByFormula: `AND({${ANNOUNCEMENT_FIELDS.ACTIVE}}, OR({${ANNOUNCEMENT_FIELDS.EXPIRY}}=BLANK(), NOT(IS_BEFORE({${ANNOUNCEMENT_FIELDS.EXPIRY}}, TODAY()))))`,
      sort: [
        { field: ANNOUNCEMENT_FIELDS.PINNED, direction: 'desc' },
        { field: ANNOUNCEMENT_FIELDS.CREATED_AT, direction: 'desc' },
      ],
    });

    res.status(200).json({
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.fields[ANNOUNCEMENT_FIELDS.TITLE] || '',
        content: a.fields[ANNOUNCEMENT_FIELDS.CONTENT] || '',
        type: a.fields[ANNOUNCEMENT_FIELDS.TYPE] || '',
        pinned: !!a.fields[ANNOUNCEMENT_FIELDS.PINNED],
        expiry: a.fields[ANNOUNCEMENT_FIELDS.EXPIRY] || null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load announcements' });
  }
}
