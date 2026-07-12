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

export function fetchHomeStats(volunteerId) {
  const params = volunteerId ? `?volunteerId=${encodeURIComponent(volunteerId)}` : '';
  return request(`/api/home-stats${params}`);
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
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'auth', volunteerId, password }),
  });
}

export function mokadAuth(volunteerId, password) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'auth', volunteerId, password }),
  });
}

export function fetchMokadReports(volunteerId, password) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'reports', volunteerId, password }),
  });
}

export function fetchMokadReportDetail(volunteerId, password, reportId) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'report-detail', volunteerId, password, reportId }),
  });
}

export function attachMokadPatrol(volunteerId, password, reportId, patrolId, note) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'attach-patrol', volunteerId, password, reportId, patrolId, note }),
  });
}

export function setMokadSubcategory(volunteerId, password, reportId, subcategoryId) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'set-subcategory', volunteerId, password, reportId, subcategoryId }),
  });
}

export function fetchMunicipalityFollowups(volunteerId, password) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'municipality-followups', volunteerId, password }),
  });
}

export function setMunicipalityResponse(volunteerId, password, logEntryId, status) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'set-municipality-response', volunteerId, password, logEntryId, status }),
  });
}

export function addMokadLogEntry(volunteerId, password, reportId, actionType, content, newStatus, forwardedTo) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({
      action: 'add-log-entry',
      volunteerId,
      password,
      reportId,
      actionType,
      content,
      newStatus,
      forwardedTo,
    }),
  });
}

export function fetchPublicStats() {
  return request('/api/public/stats');
}

export function fetchParticipation(volunteerId, password, month) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'participation', volunteerId, password, month }),
  });
}

export function resetVolunteerDevice(volunteerId, password, targetVolunteerId) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'reset-device', volunteerId, password, targetVolunteerId }),
  });
}

export function fetchCoordinatorEvents(volunteerId, password, month) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'events', volunteerId, password, month }),
  });
}

export function resolveEvent(volunteerId, password, eventId) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'resolve-event', volunteerId, password, eventId }),
  });
}

export function fetchReminders(volunteerId) {
  return request(`/api/reminders?volunteerId=${encodeURIComponent(volunteerId)}`);
}
