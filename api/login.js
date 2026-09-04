import { listRecords, updateRecord, getRecord } from './_lib/airtable.js';
import { wrapHandler } from './_lib/usage-tracker.js';
import { TABLES, VOLUNTEER_FIELDS, COORDINATOR_ROLES, MOKAD_ROLES } from './_lib/fields.js';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function toVolunteerPayload(id, fields) {
  return {
    id,
    name: fields[VOLUNTEER_FIELDS.NAME] || '',
    phone: fields[VOLUNTEER_FIELDS.PHONE] || '',
    isCoordinator: COORDINATOR_ROLES.includes(fields[VOLUNTEER_FIELDS.ROLE]),
    isMokad: MOKAD_ROLES.includes(fields[VOLUNTEER_FIELDS.ROLE]),
  };
}

// Refreshes an already-logged-in device's cached profile (name/phone/role
// flags) without going through the phone+device-claim flow again — read
// only, no side effects. Lets a session pick up fields added after the
// device originally logged in (e.g. `phone`) without needing a coordinator
// to reset the device and the volunteer to re-claim it.
async function handleRefresh(id, res) {
  try {
    const record = await getRecord(TABLES.VOLUNTEERS, id);
    res.status(200).json(toVolunteerPayload(record.id, record.fields));
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'not_found' });
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone, id } = req.body || {};

  if (id) {
    await handleRefresh(id, res);
    return;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    res.status(400).json({ error: 'missing_phone' });
    return;
  }

  try {
    const volunteers = await listRecords(TABLES.VOLUNTEERS, {
      fields: [
        VOLUNTEER_FIELDS.NAME,
        VOLUNTEER_FIELDS.PHONE,
        VOLUNTEER_FIELDS.DEVICE_CLAIMED,
        VOLUNTEER_FIELDS.ROLE,
      ],
    });

    const match = volunteers.find(
      (v) => normalizePhone(v.fields[VOLUNTEER_FIELDS.PHONE]) === normalized
    );

    if (!match) {
      res.status(404).json({ error: 'phone_not_found' });
      return;
    }

    if (match.fields[VOLUNTEER_FIELDS.DEVICE_CLAIMED]) {
      res.status(409).json({ error: 'already_claimed' });
      return;
    }

    await updateRecord(TABLES.VOLUNTEERS, match.id, {
      [VOLUNTEER_FIELDS.DEVICE_CLAIMED]: true,
    });

    res.status(200).json(toVolunteerPayload(match.id, match.fields));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'login_failed' });
  }
}

export default wrapHandler('login', handler);
