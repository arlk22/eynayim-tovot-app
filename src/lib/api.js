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

export function setMokad106TrackingNumber(volunteerId, password, reportId, trackingNumber) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({
      action: 'set-tracking-number-106',
      volunteerId,
      password,
      reportId,
      trackingNumber,
    }),
  });
}

export function setMokadDescription(volunteerId, password, reportId, description) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'set-description', volunteerId, password, reportId, description }),
  });
}

export function setMokadReadyForExternalReport(volunteerId, password, reportId, ready) {
  return request('/api/mokad', {
    method: 'POST',
    body: JSON.stringify({ action: 'set-ready-for-external-report', volunteerId, password, reportId, ready }),
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

export function fetchTomorrowRegistrations(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'tomorrow-registrations', volunteerId, password }),
  });
}

export function fetchRoutes(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'list-routes', volunteerId, password }),
  });
}

export function fetchStreets(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'list-streets', volunteerId, password }),
  });
}

export function fetchMyLedPatrols(volunteerId) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'my-led-patrols', volunteerId }),
  });
}

export function saveOwnRoute(volunteerId, patrolId, directionsText, zone, meetingPoint) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'save-own-route', volunteerId, patrolId, directionsText, zone, meetingPoint }),
  });
}

export function saveRoute(volunteerId, password, { routeId, name, streets, customLink, directionsText, meetingPoint }) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({
      action: 'save-route',
      volunteerId,
      password,
      routeId,
      name,
      streets,
      customLink,
      directionsText,
      meetingPoint,
    }),
  });
}

export function fetchScheduledPatrols(volunteerId, password, month) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'list-patrols', volunteerId, password, month }),
  });
}

export function savePatrol(volunteerId, password, patrol) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'save-patrol', volunteerId, password, ...patrol }),
  });
}

export function deletePatrol(volunteerId, password, patrolId) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete-patrol', volunteerId, password, patrolId }),
  });
}

export function fetchReportCategories(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'list-report-categories', volunteerId, password }),
  });
}

export function buildManheletReport(volunteerId, password, filters) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'build-manhelet-report', volunteerId, password, ...filters }),
  });
}

export function saveManheletReportLog(volunteerId, password, count, criteria) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'save-manhelet-report-log', volunteerId, password, count, criteria }),
  });
}

export function fetchManheletReportLog(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'list-manhelet-report-log', volunteerId, password }),
  });
}

export function updateManheletReportLog(volunteerId, password, logId, deliveredAt, deliveredTo) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'update-manhelet-report-log', volunteerId, password, logId, deliveredAt, deliveredTo }),
  });
}

export function fetchUsageSummary(volunteerId, password) {
  return request('/api/coordinator', {
    method: 'POST',
    body: JSON.stringify({ action: 'usage-summary', volunteerId, password }),
  });
}

export function fetchReminders(volunteerId) {
  return request(`/api/reminders?volunteerId=${encodeURIComponent(volunteerId)}`);
}
