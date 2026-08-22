import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchParticipation,
  resetVolunteerDevice,
  fetchCoordinatorEvents,
  resolveEvent,
  fetchUsageSummary,
  fetchTomorrowRegistrations,
  fetchScheduledPatrols,
  savePatrol,
  deletePatrol,
  fetchRoutes,
} from '../lib/api';
import './CoordinatorDashboardPage.css';

const PATROL_STATUS_OPTIONS = ['פתוח', 'מלא', 'הסתיים', 'בוטל', 'טיוטה'];

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function ymKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function whatsAppLink(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('972') ? digits : `972${digits.replace(/^0/, '')}`;
  return `https://wa.me/${intl}`;
}

function ParticipationTab() {
  const { coordinatorSession } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const monthKey = ymKey(year, month);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchParticipation(coordinatorSession.volunteerId, coordinatorSession.password, monthKey)
      .then((data) => setVolunteers(data.volunteers))
      .catch(() => setError('לא הצלחנו לטעון את נתוני ההשתתפות.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession, monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  function goToMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  async function handleReset(volunteer) {
    if (!window.confirm(`לאפס את שיוך המכשיר של ${volunteer.name}?`)) return;
    setPendingId(volunteer.id);
    try {
      await resetVolunteerDevice(
        coordinatorSession.volunteerId,
        coordinatorSession.password,
        volunteer.id
      );
    } catch {
      setError('האיפוס נכשל, נסו שוב.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="coordinator-dash__month-nav">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="חודש קודם">
          ‹
        </button>
        <strong>{MONTH_NAMES[month]}</strong>
        <button type="button" onClick={() => goToMonth(1)} aria-label="חודש הבא">
          ›
        </button>
      </div>

      {loading && <p className="coordinator-dash__loading">טוען…</p>}
      {error && <p className="coordinator-dash__error">{error}</p>}

      {!loading && (
        <div className="coordinator-dash__list">
          {volunteers.map((v) => (
            <div key={v.id} className="participation-row">
              <div className="participation-row__top">
                <div className="participation-row__info">
                  <span className="participation-row__name">{v.name}</span>
                  <span className="participation-row__status">{v.status}</span>
                </div>
                <span className={`participation-row__count${v.count < 2 ? ' participation-row__count--low' : ''}`}>
                  {v.count} סיורים
                </span>
              </div>
              <div className="participation-row__actions">
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="participation-row__contact-btn" aria-label={`התקשרות אל ${v.name}`}>
                    📞 התקשרות
                  </a>
                )}
                {v.phone && whatsAppLink(v.phone) && (
                  <a
                    href={whatsAppLink(v.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="participation-row__contact-btn participation-row__contact-btn--whatsapp"
                    aria-label={`ווטסאפ אל ${v.name}`}
                  >
                    💬 ווטסאפ
                  </a>
                )}
                <button
                  type="button"
                  className="participation-row__reset"
                  onClick={() => handleReset(v)}
                  disabled={pendingId === v.id}
                >
                  איפוס מכשיר
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventsTab() {
  const { coordinatorSession } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const monthKey = ymKey(year, month);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchCoordinatorEvents(coordinatorSession.volunteerId, coordinatorSession.password, monthKey)
      .then((data) => setEvents(data.events))
      .catch(() => setError('לא הצלחנו לטעון את דיווחי האירועים.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession, monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  function goToMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  async function handleResolve(event) {
    setPendingId(event.id);
    try {
      await resolveEvent(coordinatorSession.volunteerId, coordinatorSession.password, event.id);
      await load();
    } catch {
      setError('העדכון נכשל, נסו שוב.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="coordinator-dash__month-nav">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="חודש קודם">
          ‹
        </button>
        <strong>{MONTH_NAMES[month]}</strong>
        <button type="button" onClick={() => goToMonth(1)} aria-label="חודש הבא">
          ›
        </button>
      </div>

      {loading && <p className="coordinator-dash__loading">טוען…</p>}
      {error && <p className="coordinator-dash__error">{error}</p>}

      {!loading && events.length === 0 && (
        <p className="coordinator-dash__loading">אין דיווחי אירועים בחודש זה.</p>
      )}

      {!loading && (
        <div className="coordinator-dash__list">
          {events.map((e) => (
            <div key={e.id} className="event-card">
              <div className="event-card__header">
                <span>{e.category}</span>
                <span className={`event-card__status${e.status === 'הסתיים' ? ' event-card__status--resolved' : ''}`}>
                  {e.status}
                </span>
              </div>
              {e.location && <p className="event-card__field">מיקום: {e.location}</p>}
              {e.reporterName && <p className="event-card__field">מדווח: {e.reporterName}</p>}
              {e.intervention && <p className="event-card__field">התערבות: {e.intervention}</p>}
              {e.description && <p className="event-card__description">{e.description}</p>}
              {e.status !== 'הסתיים' && (
                <button
                  type="button"
                  className="event-card__resolve"
                  onClick={() => handleResolve(e)}
                  disabled={pendingId === e.id}
                >
                  {pendingId === e.id ? 'מעדכן…' : 'סמן כהסתיים'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatPatrolDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function reminderWhatsAppLink(name, phone, dateStr, startTime) {
  const link = whatsAppLink(phone);
  if (!link) return null;
  const message = `הי ${name}, תזכורת לסיור בתאריך ${formatPatrolDate(dateStr)} בשעה ${startTime || ''}`;
  return `${link}?text=${encodeURIComponent(message)}`;
}

function RemindersTab() {
  const { coordinatorSession } = useAuth();
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTomorrowRegistrations(coordinatorSession.volunteerId, coordinatorSession.password)
      .then((data) => setPatrols(data.patrols))
      .catch(() => setError('לא הצלחנו לטעון את הנרשמים למחר.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <p className="coordinator-dash__hint">תזכורות לסיורי מחר — שולחים אחד-אחד בלחיצה על שם המתנדב.</p>

      {loading && <p className="coordinator-dash__loading">טוען…</p>}
      {error && <p className="coordinator-dash__error">{error}</p>}

      {!loading && !error && patrols.length === 0 && (
        <p className="coordinator-dash__loading">אין סיורים עם נרשמים מחר.</p>
      )}

      {!loading && !error && (
        <div className="coordinator-dash__list">
          {patrols.map((p) => (
            <div key={p.id} className="reminder-patrol">
              <div className="reminder-patrol__header">
                <strong>
                  {formatPatrolDate(p.date)}, {p.startTime}
                </strong>
                {p.routeName && <span>{p.routeName}</span>}
              </div>
              <div className="reminder-patrol__registrants">
                {p.registrants.map((r) => {
                  const link = reminderWhatsAppLink(r.name, r.phone, p.date, p.startTime);
                  return (
                    <div key={r.id} className="reminder-row">
                      <span className="reminder-row__name">{r.name}</span>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="reminder-row__send"
                        >
                          💬 שלח תזכורת
                        </a>
                      ) : (
                        <span className="reminder-row__no-phone">אין מספר טלפון</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_PATROL_FORM = {
  date: '',
  startTime: '',
  endTime: '',
  routeId: '',
  leader: '',
  maxParticipants: '',
  status: 'פתוח',
  notes: '',
};

function ScheduleTab() {
  const { coordinatorSession } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [patrols, setPatrols] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const monthKey = ymKey(year, month);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchScheduledPatrols(coordinatorSession.volunteerId, coordinatorSession.password, monthKey)
      .then((data) => setPatrols(data.patrols))
      .catch(() => setError('לא הצלחנו לטעון את לוח הסיורים.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession, monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchRoutes(coordinatorSession.volunteerId, coordinatorSession.password)
      .then((data) => setRoutes(data.routes))
      .catch(() => setRoutes([]));
  }, [coordinatorSession]);

  function goToMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  function startCreate() {
    setEditingId('new');
    setForm({ ...EMPTY_PATROL_FORM, date: `${monthKey}-01` });
    setFormError(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      date: p.date || '',
      startTime: p.startTime || '',
      endTime: p.endTime || '',
      routeId: p.routeId || '',
      leader: p.leader || '',
      maxParticipants: p.maxParticipants != null ? String(p.maxParticipants) : '',
      status: p.status || 'פתוח',
      notes: p.notes || '',
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.date) {
      setFormError('יש לבחור תאריך.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await savePatrol(coordinatorSession.volunteerId, coordinatorSession.password, {
        patrolId: editingId === 'new' ? undefined : editingId,
        ...form,
      });
      cancelEdit();
      await load();
    } catch {
      setFormError('השמירה נכשלה, נסו שוב.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(`למחוק את הסיור בתאריך ${formatPatrolDate(p.date)}?`)) return;
    setPendingDeleteId(p.id);
    try {
      await deletePatrol(coordinatorSession.volunteerId, coordinatorSession.password, p.id);
      await load();
    } catch {
      setError('המחיקה נכשלה. ייתכן שיש נרשמים לסיור זה.');
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div>
      <div className="coordinator-dash__month-nav">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="חודש קודם">
          ‹
        </button>
        <strong>{MONTH_NAMES[month]}</strong>
        <button type="button" onClick={() => goToMonth(1)} aria-label="חודש הבא">
          ›
        </button>
      </div>

      {!editingId && (
        <button type="button" className="schedule-tab__new-btn" onClick={startCreate}>
          ➕ סיור חדש
        </button>
      )}

      {editingId && (
        <div className="schedule-tab__form">
          <h2 className="schedule-tab__form-title">{editingId === 'new' ? 'סיור חדש' : 'עריכת סיור'}</h2>

          <label className="schedule-tab__label">
            תאריך
            <input
              type="date"
              className="schedule-tab__input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>

          <div className="schedule-tab__row">
            <label className="schedule-tab__label">
              שעת התחלה
              <input
                type="text"
                className="schedule-tab__input"
                placeholder="18:00"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>
            <label className="schedule-tab__label">
              שעת סיום
              <input
                type="text"
                className="schedule-tab__input"
                placeholder="20:00"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>
          </div>

          <label className="schedule-tab__label">
            מסלול
            <select
              className="schedule-tab__input"
              value={form.routeId}
              onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            >
              <option value="">ללא מסלול</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="schedule-tab__label">
            מוביל סיור
            <input
              type="text"
              className="schedule-tab__input"
              value={form.leader}
              onChange={(e) => setForm({ ...form, leader: e.target.value })}
            />
          </label>

          <div className="schedule-tab__row">
            <label className="schedule-tab__label">
              מספר משתתפים מקס
              <input
                type="number"
                min="0"
                className="schedule-tab__input"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              />
            </label>
            <label className="schedule-tab__label">
              סטטוס
              <select
                className="schedule-tab__input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {PATROL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="schedule-tab__label">
            הערות
            <textarea
              className="schedule-tab__textarea"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {formError && <p className="coordinator-dash__error">{formError}</p>}

          <div className="schedule-tab__form-actions">
            <button type="button" className="schedule-tab__save" onClick={handleSave} disabled={saving}>
              {saving ? 'שומר…' : 'שמירה'}
            </button>
            <button type="button" className="schedule-tab__cancel" onClick={cancelEdit}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading && <p className="coordinator-dash__loading">טוען…</p>}
      {error && <p className="coordinator-dash__error">{error}</p>}

      {!loading && !error && patrols.length === 0 && (
        <p className="coordinator-dash__loading">אין סיורים מתוזמנים בחודש זה.</p>
      )}

      {!loading && (
        <div className="coordinator-dash__list">
          {patrols.map((p) => (
            <div key={p.id} className="schedule-card">
              <div className="schedule-card__header">
                <strong>
                  {p.dayOfWeek ? `${p.dayOfWeek}, ` : ''}
                  {formatPatrolDate(p.date)}
                  {p.startTime ? `, ${p.startTime}` : ''}
                </strong>
                <span className={`schedule-card__status${p.status === 'בוטל' ? ' schedule-card__status--cancelled' : ''}`}>
                  {p.status}
                </span>
              </div>
              {p.routeName && <p className="schedule-card__field">מסלול: {p.routeName}</p>}
              {p.leader && <p className="schedule-card__field">מוביל: {p.leader}</p>}
              <p className="schedule-card__field">
                נרשמים: {p.registeredCount}
                {p.maxParticipants != null ? ` / ${p.maxParticipants}` : ''}
              </p>
              {p.notes && <p className="schedule-card__field">הערות: {p.notes}</p>}
              <div className="schedule-card__actions">
                <button type="button" className="schedule-card__edit" onClick={() => startEdit(p)}>
                  עריכה
                </button>
                <button
                  type="button"
                  className="schedule-card__delete"
                  onClick={() => handleDelete(p)}
                  disabled={p.registeredCount > 0 || pendingDeleteId === p.id}
                  title={p.registeredCount > 0 ? 'לא ניתן למחוק סיור עם נרשמים — ניתן לבטל דרך הסטטוס' : ''}
                >
                  מחיקה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsageBarList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.calls));
  return (
    <div className="usage-bar-list">
      {rows.map((r) => (
        <div key={r.label} className="usage-bar-row">
          <div className="usage-bar-row__top">
            <span className="usage-bar-row__label">{r.label}</span>
            <span className="usage-bar-row__count">{r.calls}</span>
          </div>
          <div className="usage-bar-row__track">
            <div className="usage-bar-row__fill" style={{ width: `${(r.calls / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageTab() {
  const { coordinatorSession } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUsageSummary(coordinatorSession.volunteerId, coordinatorSession.password)
      .then(setSummary)
      .catch(() => setError('לא הצלחנו לטעון את נתוני השימוש ב-API.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession]);

  if (loading) return <p className="coordinator-dash__loading">טוען…</p>;
  if (error) return <p className="coordinator-dash__error">{error}</p>;
  if (!summary || summary.totalCalls === 0) {
    return <p className="coordinator-dash__loading">אין עדיין נתוני שימוש ב-API בטווח הזמן הזה.</p>;
  }

  return (
    <div className="usage-summary">
      <div className="usage-summary__headline">
        <strong>{summary.totalCalls}</strong> קריאות Airtable ב-{summary.distinctDays} מתוך {summary.windowDays} הימים האחרונים
      </div>

      <div className="usage-summary__section">
        <h2 className="usage-summary__section-title">לפי מתנדב</h2>
        <UsageBarList rows={summary.byVolunteer} />
      </div>

      <div className="usage-summary__section">
        <h2 className="usage-summary__section-title">לפי מכשיר</h2>
        <UsageBarList rows={summary.byDevice} />
      </div>

      <div className="usage-summary__section">
        <h2 className="usage-summary__section-title">לפי מסך</h2>
        <UsageBarList rows={summary.byEndpoint} />
      </div>
    </div>
  );
}

export default function CoordinatorDashboardPage() {
  const [tab, setTab] = useState('schedule');

  return (
    <div className="coordinator-dash">
      <h1 className="coordinator-dash__title">👥 אזור הרכז</h1>

      <div className="coordinator-dash__tabs">
        <button
          type="button"
          className={`coordinator-dash__tab${tab === 'schedule' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          לוח סיורים
        </button>
        <button
          type="button"
          className={`coordinator-dash__tab${tab === 'participation' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('participation')}
        >
          מעקב השתתפות
        </button>
        <button
          type="button"
          className={`coordinator-dash__tab${tab === 'events' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('events')}
        >
          דיווחי אירועים
        </button>
        <button
          type="button"
          className={`coordinator-dash__tab${tab === 'reminders' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('reminders')}
        >
          תזכורות סיור
        </button>
        <button
          type="button"
          className={`coordinator-dash__tab${tab === 'usage' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('usage')}
        >
          שימוש ב-API
        </button>
      </div>

      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'participation' && <ParticipationTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'reminders' && <RemindersTab />}
      {tab === 'usage' && <UsageTab />}
    </div>
  );
}
