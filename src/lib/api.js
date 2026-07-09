async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

export function fetchHomeStats() {
  return request('/api/home-stats');
}

export function login(phone) {
  return request('/api/login', { method: 'POST', body: JSON.stringify({ phone }) });
}

export function fetchPatrols(month) {
  return request(`/api/patrols?month=${encodeURIComponent(month)}`);
}

export function createRegistration(volunteerId, patrolId) {
  return request('/api/registrations', {
    method: 'POST',
    body: JSON.stringify({ volunteerId, patrolId }),
  });
}

export function fetchAnnouncements() {
  return request('/api/announcements');
}

export function fetchEmergencyContacts() {
  return request('/api/emergency-contacts');
}

export function coordinatorAuth(volunteerId, password) {
  return request('/api/coordinator-auth', {
    method: 'POST',
    body: JSON.stringify({ volunteerId, password }),
  });
}

export function fetchParticipation(volunteerId, password, month) {
  const params = new URLSearchParams({ volunteerId, password, month });
  return request(`/api/coordinator/participation?${params}`);
}

export function resetVolunteerDevice(volunteerId, password, targetVolunteerId) {
  return request('/api/coordinator/reset-device', {
    method: 'POST',
    body: JSON.stringify({ volunteerId, password, targetVolunteerId }),
  });
}

export function fetchCoordinatorEvents(volunteerId, password) {
  const params = new URLSearchParams({ volunteerId, password });
  return request(`/api/coordinator/events?${params}`);
}

export function resolveEvent(volunteerId, password, eventId) {
  return request('/api/coordinator/resolve-event', {
    method: 'POST',
    body: JSON.stringify({ volunteerId, password, eventId }),
  });
}
