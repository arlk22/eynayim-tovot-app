import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchParticipation,
  resetVolunteerDevice,
  fetchCoordinatorEvents,
  resolveEvent,
  fetchUsageSummary,
} from '../lib/api';
import './CoordinatorDashboardPage.css';

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
  const [tab, setTab] = useState('participation');

  return (
    <div className="coordinator-dash">
      <h1 className="coordinator-dash__title">👥 אזור הרכז</h1>

      <div className="coordinator-dash__tabs">
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
          className={`coordinator-dash__tab${tab === 'usage' ? ' coordinator-dash__tab--active' : ''}`}
          onClick={() => setTab('usage')}
        >
          שימוש ב-API
        </button>
      </div>

      {tab === 'participation' && <ParticipationTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'usage' && <UsageTab />}
    </div>
  );
}
