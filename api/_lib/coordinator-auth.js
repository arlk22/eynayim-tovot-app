import { getRecord } from './airtable.js';
import { TABLES, VOLUNTEER_FIELDS, COORDINATOR_ROLES } from './fields.js';

// Verifies that (volunteerId, password) belongs to an active coordinator.
// Returns the volunteer record on success, or null on failure.
export async function verifyCoordinator(volunteerId, password) {
  if (!volunteerId || !password) return null;

  let record;
  try {
    record = await getRecord(TABLES.VOLUNTEERS, volunteerId);
  } catch {
    return null;
  }

  const role = record.fields[VOLUNTEER_FIELDS.ROLE];
  const storedPassword = record.fields[VOLUNTEER_FIELDS.COORDINATOR_PASSWORD];

  if (!COORDINATOR_ROLES.includes(role)) return null;
  if (!storedPassword || storedPassword !== password) return null;

  return record;
}
