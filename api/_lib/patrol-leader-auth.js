import { getRecord } from './airtable.js';
import { TABLES, VOLUNTEER_FIELDS, PATROL_FIELDS } from './fields.js';

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

// "מוביל סיור" is intentionally free text on Patrols, not a Link to
// Volunteers (see project notes — kept flexible because not every leader is
// a recognized volunteer yet). In practice it's sometimes the full name and
// sometimes just a first name, so match leniently in either direction rather
// than requiring an exact string match.
export function namesMatch(volunteerName, leaderName) {
  const v = normalizeName(volunteerName);
  const l = normalizeName(leaderName);
  if (!v || !l) return false;
  return v === l || v.includes(l) || l.includes(v);
}

// Verifies the logged-in volunteer is really listed as the leader of this
// specific patrol, before granting them scoped access to edit its route.
// Returns { volunteer, patrol } on success, or null.
export async function verifyPatrolLeader(volunteerId, patrolId) {
  if (!volunteerId || !patrolId) return null;

  let volunteer, patrol;
  try {
    [volunteer, patrol] = await Promise.all([
      getRecord(TABLES.VOLUNTEERS, volunteerId),
      getRecord(TABLES.PATROLS, patrolId),
    ]);
  } catch {
    return null;
  }

  const volunteerName = volunteer.fields[VOLUNTEER_FIELDS.NAME];
  const leaderName = patrol.fields[PATROL_FIELDS.LEADER];
  if (!namesMatch(volunteerName, leaderName)) return null;

  return { volunteer, patrol };
}
