// One-time (and safely re-runnable) geocoding backfill: fills in Lat/Lng on
// Hadar_New_Report using the report's full address (street + house number),
// so the public map can place a precise pin per report. Only the DISPLAY
// text shown to residents ever omits the house number — the pin position
// itself is deliberately precise per the project owner's decision.
//
// Uses OpenStreetMap's free Nominatim geocoder (no API key, budget-friendly
// for a volunteer project) — rate-limited to 1 request/second per their
// usage policy, with a proper User-Agent identifying this app.
//
// Run: node scripts/geocode-reports.js

import 'dotenv/config';
import { listRecords, updateRecord } from '../api/_lib/airtable.js';
import { TABLES, HADAR_REPORT_FIELDS } from '../api/_lib/fields.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'eynayim-tovot-app/1.0 (Hadar neighborhood hazard map; community volunteer project)';
const RATE_LIMIT_MS = 1100;

// Street names like "הרצל" repeat in nearly every Israeli city — without a
// bounding box Nominatim can silently match a same-named street in a
// different city entirely. Generous box around Haifa (not just Hadar) so
// legitimate matches near the edges of the city still work.
const HAIFA_VIEWBOX = '34.90,32.90,35.10,32.70'; // left,top,right,bottom
const FORCE_REGEOCODE_ALL = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(address, { bounded = true } = {}) {
  const params = new URLSearchParams({ format: 'json', limit: '1', q: address });
  if (bounded) {
    params.set('viewbox', HAIFA_VIEWBOX);
    params.set('bounded', '1');
  }
  const url = `${NOMINATIM_URL}?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function main() {
  const reports = await listRecords(TABLES.HADAR_NEW_REPORT, {
    fields: [HADAR_REPORT_FIELDS.MAP_ADDRESS, HADAR_REPORT_FIELDS.LAT, HADAR_REPORT_FIELDS.LNG],
  });

  const needsGeocoding = reports.filter((r) => {
    if (!r.fields[HADAR_REPORT_FIELDS.MAP_ADDRESS]) return false;
    if (FORCE_REGEOCODE_ALL) return true;
    return r.fields[HADAR_REPORT_FIELDS.LAT] == null || r.fields[HADAR_REPORT_FIELDS.LNG] == null;
  });

  console.log(`${reports.length} reports total, ${needsGeocoding.length} to (re)geocode.`);

  let success = 0;
  let failed = 0;

  for (const r of needsGeocoding) {
    const mapAddress = r.fields[HADAR_REPORT_FIELDS.MAP_ADDRESS];
    const address = `${mapAddress}, ישראל`;
    try {
      let coords = await geocode(address);
      let usedFallback = false;
      if (!coords) {
        // Retry without the house number — some exact street+number
        // combos aren't in OSM's data even when the street itself is.
        const streetOnly = mapAddress.replace(/^(.*?)\s*\d+\s*,/, '$1,');
        if (streetOnly !== mapAddress) {
          coords = await geocode(`${streetOnly}, ישראל`);
          usedFallback = true;
          await sleep(RATE_LIMIT_MS);
        }
      }
      if (coords) {
        await updateRecord(TABLES.HADAR_NEW_REPORT, r.id, {
          [HADAR_REPORT_FIELDS.LAT]: coords.lat,
          [HADAR_REPORT_FIELDS.LNG]: coords.lng,
        });
        console.log(`OK   ${address} -> ${coords.lat}, ${coords.lng}${usedFallback ? ' (street-level fallback)' : ''}`);
        success++;
      } else {
        console.log(`MISS ${address} -> no geocoding result even without house number`);
        failed++;
      }
    } catch (err) {
      console.log(`ERR  ${address} -> ${err.message}`);
      failed++;
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nDone. Geocoded: ${success}, failed/no-match: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
