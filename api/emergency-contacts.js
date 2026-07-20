import { listRecords } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import { TABLES, EMERGENCY_CONTACT_FIELDS } from './_lib/fields.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  try {
    const contacts = await listRecords(TABLES.EMERGENCY_CONTACTS, {
      filterByFormula: `{${EMERGENCY_CONTACT_FIELDS.ACTIVE}}`,
      sort: [{ field: EMERGENCY_CONTACT_FIELDS.ORDER, direction: 'asc' }],
    });

    res.status(200).json({
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.fields[EMERGENCY_CONTACT_FIELDS.NAME] || '',
        phone: c.fields[EMERGENCY_CONTACT_FIELDS.PHONE] || '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load emergency contacts' });
  }
}

export default wrapHandler('emergency-contacts', handler);
