import { getRecord } from './airtable.js';
import { TABLES, VOLUNTEER_FIELDS, MOKAD_ROLES } from './fields.js';

// Verifies that (volunteerId, password) belongs to an active מוקד volunteer.
// Returns the volunteer record on success, or null on failure.
export async function verifyMokad(volunteerId, password) {
  if (!volunteerId || !password) return null;

  let record;
  try {
    record = await getRecord(TABLES.VOLUNTEERS, volunteerId);
  } catch {
    return null;
  }

  const role = record.fields[VOLUNTEER_FIELDS.ROLE];
  const storedPassword = record.fields[VOLUNTEER_FIELDS.MOKAD_PASSWORD];

  if (!MOKAD_ROLES.includes(role)) return null;
  if (!storedPassword || storedPassword !== password) return null;

  return record;
}
