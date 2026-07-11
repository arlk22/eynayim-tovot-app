import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMokadReportDetail,
  attachMokadPatrol,
  addMokadLogEntry,
} from '../lib/api';
import './MokadReportDetail.css';

const ACTION_TYPES = [
  'אימות שטח',
  'פניה לעירייה',
  'עדכון ע"י תושב',
  'ביקור חוזר',
  'שינוי סטטוס',
  'מידע הסטורי',
  'רעיון לפתרון',
  'תיעוד מצולם',
];

const STATUSES = ['חדש', 'אומת', 'בטיפול', 'נסגר'];

function formatPatrolLabel(p) {
  const dateStr = p.date ? new Date(p.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '';
  const parts = [dateStr, p.startTime, p.routeName || p.routeArea].filter(Boolean);
  return parts.join(' · ');
}

export default function MokadReportDetail({ reportId, onClose, onChanged }) {
  const { mokadSession } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPatrolId, setSelectedPatrolId] = useState('');
  const [patrolNote, setPatrolNote] = useState('');
  const [attaching, setAttaching] = useState(false);

  const [actionType, setActionType] = useState(ACTION_TYPES[0]);
  const [logContent, setLogContent] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMokadReportDetail(mokadSession.volunteerId, mokadSession.password, reportId)
      .then((d) => setData(d))
      .catch(() => setError('לא הצלחנו לטעון את פרטי הדיווח.'))
      .finally(() => setLoading(false));
  }, [mokadSession, reportId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAttach() {
    if (!selectedPatrolId) return;
    setAttaching(true);
    try {
      await attachMokadPatrol(
        mokadSession.volunteerId,
        mokadSession.password,
        reportId,
        selectedPatrolId,
        patrolNote
      );
      setPatrolNote('');
      await load();
      onChanged?.();
    } catch {
      setError('הצמדת הסיור נכשלה, נסו שוב.');
    } finally {
      setAttaching(false);
    }
  }

  async function handleAddLog(e) {
    e.preventDefault();
    setSavingLog(true);
    try {
      await addMokadLogEntry(
        mokadSession.volunteerId,
        mokadSession.password,
        reportId,
        actionType,
        logContent,
        logStatus || undefined
      );
      setLogContent('');
      setLogStatus('');
      await load();
      onChanged?.();
    } catch {
      setError('הוספת הרשומה נכשלה, נסו שוב.');
    } finally {
      setSavingLog(false);
    }
  }

  return (
    <div className="mokad-detail__backdrop" onClick={onClose}>
      <div className="mokad-detail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mokad-detail__close" onClick={onClose} aria-label="סגירה">
          ✕
        </button>

        {loading && <p className="mokad-dash__loading">טוען…</p>}
        {error && <p className="mokad-dash__error">{error}</p>}

        {data && (
          <>
            <h2 className="mokad-detail__title">
              {data.report.category}
              {data.report.subcategory ? ` — ${data.report.subcategory}` : ''}
            </h2>

            {data.report.photos.length > 0 && (
              <div className="mokad-detail__photos">
                {data.report.photos.map((url) => (
                  <img key={url} src={url} alt="" className="mokad-detail__photo" />
                ))}
              </div>
            )}

            <div className="mokad-detail__meta">
              <span data-status={data.report.status} className="mokad-detail__status">
                {data.report.status || 'ללא סטטוס'}
              </span>
              {data.report.urgency && <span>דחיפות: {data.report.urgency}</span>}
            </div>

            <p className="mokad-detail__address">
              {data.report.address}
              {data.report.houseNumber ? ` ${data.report.houseNumber}` : ''}
            </p>
            {data.report.description && <p className="mokad-detail__description">{data.report.description}</p>}

            <div className="mokad-detail__reporter">
              {data.report.reporterName && <span>מדווח: {data.report.reporterName}</span>}
              {data.report.phone && <span>📞 {data.report.phone}</span>}
            </div>

            <section className="mokad-detail__section">
              <h3>הצמדה לסיור</h3>
              {data.report.verifyingPatrolId && (
                <p className="mokad-detail__attached-note">✓ מוצמד כבר לסיור</p>
              )}
              <div className="mokad-detail__attach-row">
                <select
                  className="mokad-detail__select"
                  value={selectedPatrolId}
                  onChange={(e) => setSelectedPatrolId(e.target.value)}
                >
                  <option value="">בחרו סיור…</option>
                  {data.availablePatrols.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatPatrolLabel(p)}
                      {p.isCurrentlyAttached ? ' (מוצמד)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mokad-detail__btn"
                  onClick={handleAttach}
                  disabled={!selectedPatrolId || attaching}
                >
                  {attaching ? 'מצמיד…' : 'הצמד'}
                </button>
              </div>
              <input
                type="text"
                className="mokad-detail__input"
                placeholder="הערה למתנדבי הסיור (לא חובה)"
                value={patrolNote}
                onChange={(e) => setPatrolNote(e.target.value)}
              />
            </section>

            <section className="mokad-detail__section">
              <h3>לוג טיפול</h3>
              <form className="mokad-detail__log-form" onSubmit={handleAddLog}>
                <select
                  className="mokad-detail__select"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <textarea
                  className="mokad-detail__textarea"
                  placeholder="פרטי העדכון…"
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                />
                <select
                  className="mokad-detail__select"
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                >
                  <option value="">ללא שינוי סטטוס</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      עדכן סטטוס ל: {s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="mokad-detail__btn" disabled={savingLog}>
                  {savingLog ? 'שומר…' : 'הוסף ללוג'}
                </button>
              </form>

              <ul className="mokad-detail__log-list">
                {data.log.map((entry) => (
                  <li key={entry.id} className="mokad-detail__log-entry">
                    <div className="mokad-detail__log-entry-header">
                      <strong>{entry.actionType}</strong>
                      <span>
                        {entry.datetime
                          ? new Date(entry.datetime).toLocaleString('he-IL', {
                              day: 'numeric',
                              month: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    {entry.volunteerName && <p className="mokad-detail__log-by">מאת: {entry.volunteerName}</p>}
                    {entry.content && <p>{entry.content}</p>}
                    {entry.photoUrl && <img src={entry.photoUrl} alt="" className="mokad-detail__log-photo" />}
                  </li>
                ))}
                {data.log.length === 0 && <p className="mokad-dash__loading">אין רשומות בלוג עדיין.</p>}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
