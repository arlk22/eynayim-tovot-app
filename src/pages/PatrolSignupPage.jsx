import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPatrols, createRegistration } from '../lib/api';
import './PatrolSignupPage.css';

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const MIN_RECOMMENDED_PER_MONTH = 2;

function ymKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function dayKey(dateStr) {
  return dateStr; // Airtable date fields already come back as 'YYYY-MM-DD'
}

export default function PatrolSignupPage() {
  const { volunteer } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingPatrolId, setPendingPatrolId] = useState(null);
  const [popup, setPopup] = useState(null);
  const [error, setError] = useState(null);

  const monthKey = ymKey(year, month);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPatrols(monthKey);
      setPatrols(data.patrols);
      return data.patrols;
    } catch {
      setError('לא הצלחנו לטעון את הסיורים. נסו לרענן את העמוד.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
    setSelectedDay(null);
  }, [load]);

  const patrolsByDay = useMemo(() => {
    const map = new Map();
    for (const p of patrols) {
      if (!p.date) continue;
      const key = dayKey(p.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return map;
  }, [patrols]);

  const myPatrolsThisMonth = useMemo(
    () => patrols.filter((p) => p.joined.some((j) => j.id === volunteer?.id)),
    [patrols, volunteer]
  );

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

  async function handleJoin(patrol) {
    if (!volunteer) return;
    setPendingPatrolId(patrol.id);
    try {
      await createRegistration(volunteer.id, patrol.id);
      const refreshed = (await load()) || [];
      const countAfter = refreshed.filter((p) => p.joined.some((j) => j.id === volunteer.id)).length;

      let message;
      if (countAfter >= MIN_RECOMMENDED_PER_MONTH) {
        message =
          countAfter === MIN_RECOMMENDED_PER_MONTH
            ? 'תודה! נרשמת לשני סיורים'
            : `תודה! נרשמת ל-${countAfter} סיורים החודש`;
      } else {
        const remaining = MIN_RECOMMENDED_PER_MONTH - countAfter;
        message =
          remaining === 1
            ? 'תודה! נותר לבחור עוד סיור אחד'
            : `תודה! נותר לבחור עוד ${remaining} סיורים`;
      }
      setPopup(message);
    } catch {
      setError('ההרשמה לא הצליחה. נסו שוב.');
    } finally {
      setPendingPatrolId(null);
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDayPatrols = selectedDay ? patrolsByDay.get(selectedDay) || [] : [];

  return (
    <div className="patrol-page">
      <div className="patrol-page__month-nav">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="חודש קודם">
          ‹
        </button>
        <h1 className="patrol-page__title">סיורי חודש {MONTH_NAMES[month]}</h1>
        <button type="button" onClick={() => goToMonth(1)} aria-label="חודש הבא">
          ›
        </button>
      </div>

      <p className="patrol-page__hint">
        בחרו את ימי הסיור המתאימים לכם. מומלץ (לא חובה) להשתתף בלפחות {MIN_RECOMMENDED_PER_MONTH} סיורים בחודש.
      </p>

      {error && <p className="patrol-page__error">{error}</p>}

      <div className="patrol-page__calendar">
        {WEEKDAYS.map((w) => (
          <div key={w} className="patrol-page__weekday">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} className="patrol-page__day patrol-page__day--empty" />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hasOpenPatrol = (patrolsByDay.get(key) || []).some((p) => p.status === 'פתוח');
          const isSelected = selectedDay === key;
          return (
            <button
              key={key}
              type="button"
              className={`patrol-page__day${hasOpenPatrol ? ' patrol-page__day--open' : ''}${isSelected ? ' patrol-page__day--selected' : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              disabled={!(patrolsByDay.get(key) || []).length}
            >
              {d}
            </button>
          );
        })}
      </div>

      {loading && <p className="patrol-page__loading">טוען סיורים…</p>}

      {selectedDay && selectedDayPatrols.length > 0 && (
        <div className="patrol-page__day-patrols">
          {selectedDayPatrols.map((p) => {
            const alreadyJoined = p.joined.some((j) => j.id === volunteer?.id);
            const missing = p.maxParticipants != null ? p.maxParticipants - p.joined.length : null;
            const atOrOverCapacity = missing != null && missing <= 0;
            // Capacity is a soft target, not a hard cap — registration always stays open
            // while the patrol status itself is 'פתוח' (mirrors the monthly-minimum policy).
            const joinable = p.status === 'פתוח';
            return (
              <div key={p.id} className="patrol-card">
                <div className="patrol-card__header">
                  <strong>
                    {p.dayOfWeek} {p.date?.slice(8, 10)}/{p.date?.slice(5, 7)}
                  </strong>
                  <span>{p.startTime}{p.endTime ? `-${p.endTime}` : ''}</span>
                </div>
                {p.routeName && (
                  <p className="patrol-card__route">
                    מסלול: {p.routeName}
                    {p.routeLink && (
                      <a
                        href={p.routeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="patrol-card__route-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 מסלול הליכה
                      </a>
                    )}
                  </p>
                )}
                {p.leader && <p className="patrol-card__leader">מוביל: {p.leader}</p>}

                <p className="patrol-card__count">
                  {p.joined.length} מתוך {p.maxParticipants ?? '?'}
                </p>

                {p.joined.length > 0 && (
                  <p className="patrol-card__joined">
                    מי כבר הצטרפו: {p.joined.map((j) => j.name).filter(Boolean).join(', ')}
                  </p>
                )}

                {joinable && (
                  <p className="patrol-card__encourage">
                    {atOrOverCapacity
                      ? 'מכסת המסיירים מלאה אבל נשמח גם להצטרפותך'
                      : `נשמח לצרף עוד ${missing} מתנדב/ים!`}
                  </p>
                )}

                <label className="patrol-card__checkbox">
                  <input
                    type="checkbox"
                    checked={alreadyJoined}
                    disabled={alreadyJoined || !joinable || pendingPatrolId === p.id}
                    onChange={() => !alreadyJoined && joinable && handleJoin(p)}
                  />
                  {alreadyJoined
                    ? 'נרשמת לסיור ✓'
                    : !joinable
                      ? 'הסיור סגור להרשמה'
                      : pendingPatrolId === p.id
                        ? 'נרשם…'
                        : 'אני מצטרף לסיור'}
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="patrol-page__my-patrols">
        <h2>הסיורים שלי לחודש {MONTH_NAMES[month]}</h2>
        {myPatrolsThisMonth.length === 0 ? (
          <p className="patrol-page__my-empty">עדיין לא נרשמתם לסיור החודש.</p>
        ) : (
          <ul className="patrol-page__my-list">
            {myPatrolsThisMonth.map((p) => (
              <li key={p.id}>
                <input type="checkbox" checked disabled />
                <span>
                  {p.dayOfWeek} {p.date?.slice(8, 10)}/{p.date?.slice(5, 7)}
                  {p.routeName ? ` — ${p.routeName}` : ''}
                  {p.routeLink && (
                    <a
                      href={p.routeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="patrol-card__route-link"
                    >
                      🔗 מסלול
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {popup && (
        <div className="patrol-page__popup-backdrop" onClick={() => setPopup(null)}>
          <div className="patrol-page__popup" onClick={(e) => e.stopPropagation()}>
            <p>{popup}</p>
            <button type="button" onClick={() => setPopup(null)}>
              הבנתי
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
