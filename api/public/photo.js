import { getRecord } from '../_lib/airtable.js';
import { wrapHandler } from '../_lib/usage-tracker.js';
import { TABLES, HADAR_REPORT_FIELDS } from '../_lib/fields.js';

// Public, unauthenticated redirect to a report's current main photo.
// Airtable attachment URLs expire after a few hours, so anything that
// needs to keep working later (e.g. the WhatsApp handoff to the
// municipality) must link here instead of embedding the raw Airtable URL.
async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query || {};
  if (!id) {
    res.status(400).json({ error: 'missing_id' });
    return;
  }

  try {
    const report = await getRecord(TABLES.HADAR_NEW_REPORT, id);
    const url = report.fields[HADAR_REPORT_FIELDS.MAIN_PHOTO]?.[0]?.url;
    if (!url) {
      res.status(404).json({ error: 'photo_not_found' });
      return;
    }
    res.redirect(302, url);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'not_found' });
  }
}

export default wrapHandler('public-photo', handler);
