import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMokadReportDetail,
  attachMokadPatrol,
  addMokadLogEntry,
  setMokadSubcategory,
} from '../lib/api';
import PhotoLightbox from '../components/PhotoLightbox';
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

// מספר הווטסאפ של מוקד עיריית חיפה: 04-8357106 בפורמט בינלאומי (972 + ללא ה-0 המוביל).
const MOKAD_106_WHATSAPP_NUMBER = '97248357106';
const MOKAD_106_LABEL = 'מוקד עירוני חיפה 106 (WhatsApp)';

function formatPatrolLabel(p) {
  const dateStr = p.date ? new Date(p.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '';
  const parts = [dateStr, p.startTime, p.routeName || p.routeArea].filter(Boolean);
  return parts.join(' · ');
}

function formatShortDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
}

function daysLabel(days) {
  if (days === null || days === undefined) return 'תאריך לא ידוע';
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול (יום 1)';
  return `${days} ימים`;
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
  const [forwarding, setForwarding] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [whatsappMessageText, setWhatsappMessageText] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [savingSubcategory, setSavingSubcategory] = useState(false);

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

  function handleOpenWhatsapp() {
    if (!data) return;
    const lines = [];
    if (data.report.photos.length > 0) {
      lines.push(`תמונה: ${window.location.origin}/api/public/photo?id=${data.report.id}`, '');
    }
    lines.push(
      'דיווח מפגע - מתנדבי "עיניים טובות" רובע הדר',
      '',
      `קטגוריה: ${data.report.category}`,
      `תת קטגוריה: ${data.report.subcategory || '—'}`,
      `כתובת: ${data.report.address}`,
      `תיאור: ${data.report.description || '—'}`,
      '',
      `נמסר ע"י: ${mokadSession.name || 'מוקדן/ית'}, מוקד המתנדבים "עיניים טובות" – רובע הדר`,
      `מס' דיווח: ${data.report.reportNumber ?? data.report.id}`
    );
    const text = lines.join('\n');
    window.open(
      `https://wa.me/${MOKAD_106_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setWhatsappMessageText(text);
    setWhatsappOpened(true);
  }

  async function handleConfirmSent() {
    if (forwarding) return;
    setForwarding(true);
    try {
      await addMokadLogEntry(
        mokadSession.volunteerId,
        mokadSession.password,
        reportId,
        'פניה לעירייה',
        `הודעה שנשלחה בווטסאפ ל${MOKAD_106_LABEL}:\n\n${whatsappMessageText}`,
        undefined,
        MOKAD_106_LABEL
      );
      setWhatsappOpened(false);
      await load();
      onChanged?.();
    } catch {
      setError('סימון ההעברה נכשל, נסו שוב.');
    } finally {
      setForwarding(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!newStatus || newStatus === data.report.status || changingStatus) return;
    setChangingStatus(true);
    try {
      await addMokadLogEntry(
        mokadSession.volunteerId,
        mokadSession.password,
        reportId,
        'שינוי סטטוס',
        'עודכן ישירות מכרטיסיית המפגע',
        newStatus
      );
      await load();
      onChanged?.();
    } catch {
      setError('עדכון הסטטוס נכשל, נסו שוב.');
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleSaveSubcategory() {
    if (!selectedSubcategoryId || savingSubcategory) return;
    setSavingSubcategory(true);
    try {
      await setMokadSubcategory(mokadSession.volunteerId, mokadSession.password, reportId, selectedSubcategoryId);
      setSelectedSubcategoryId('');
      await load();
      onChanged?.();
    } catch {
      setError('שמירת תת הקטגוריה נכשלה, נסו שוב.');
    } finally {
      setSavingSubcategory(false);
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
            {data.possibleDuplicate && (
              <div className="mokad-detail__duplicate-banner">
                ⚠️ ייתכן וזהו כפל של דיווח מ-{formatShortDate(data.possibleDuplicate.reportedAt)} באותו רחוב
                ובאותה קטגוריה ({data.possibleDuplicate.address}). כדאי לבדוק לפני שממשיכים.
              </div>
            )}

            <h2 className="mokad-detail__title">
              {data.report.category}
              {data.report.subcategory ? ` — ${data.report.subcategory}` : ''}
            </h2>

            <div className="mokad-detail__fields">
              {data.report.reportNumber != null && (
                <div>
                  <strong>מזהה:</strong> {data.report.reportNumber}
                </div>
              )}
              <div>
                <strong>קטגוריה:</strong> {data.report.category || '—'}
              </div>
              <div>
                <strong>תת קטגוריה:</strong>{' '}
                {data.report.subcategory || (
                  <span className="mokad-detail__subcategory-picker">
                    {data.availableSubcategories?.length > 0 ? (
                      <>
                        <select
                          className="mokad-detail__select mokad-detail__select--inline"
                          value={selectedSubcategoryId}
                          onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                        >
                          <option value="">בחרו תת קטגוריה…</option>
                          {data.availableSubcategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="mokad-detail__btn"
                          onClick={handleSaveSubcategory}
                          disabled={!selectedSubcategoryId || savingSubcategory}
                        >
                          {savingSubcategory ? 'שומר…' : 'שמור'}
                        </button>
                      </>
                    ) : (
                      'לא צוינה'
                    )}
                  </span>
                )}
              </div>
              <div>
                <strong>גיל דיווח:</strong> {daysLabel(data.report.daysSinceReport)}
              </div>
            </div>

            {data.report.photos.length > 0 && (
              <div className="mokad-detail__photos">
                {data.report.photos.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="mokad-detail__photo"
                    onClick={() => setLightboxSrc(url)}
                  />
                ))}
              </div>
            )}

            <div className="mokad-detail__meta">
              <select
                className="mokad-detail__status-select"
                data-status={data.report.status}
                value={data.report.status || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={changingStatus}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {data.report.urgency && <span>דחיפות: {data.report.urgency}</span>}
            </div>

            <p className="mokad-detail__address">{data.report.address}</p>
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
              <h3>העברה לגורם מטפל</h3>
              <button
                type="button"
                className="mokad-detail__btn mokad-detail__btn--whatsapp"
                onClick={handleOpenWhatsapp}
              >
                {`📲 פתח בווטסאפ ל${MOKAD_106_LABEL}`}
              </button>
              {whatsappOpened && (
                <>
                  <p className="mokad-detail__whatsapp-hint">
                    לאחר ששלחתם בפועל את ההודעה בווטסאפ, אשרו כאן כדי לרשום זאת במעקב:
                  </p>
                  <button
                    type="button"
                    className="mokad-detail__btn"
                    onClick={handleConfirmSent}
                    disabled={forwarding}
                  >
                    {forwarding ? 'שומר…' : '✅ ההודעה נשלחה בפועל'}
                  </button>
                </>
              )}
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
                    {entry.content && <p className="mokad-detail__log-content">{entry.content}</p>}
                    {entry.photoUrl && (
                      <img
                        src={entry.photoUrl}
                        alt=""
                        className="mokad-detail__log-photo"
                        onClick={() => setLightboxSrc(entry.photoUrl)}
                      />
                    )}
                  </li>
                ))}
                {data.log.length === 0 && <p className="mokad-dash__loading">אין רשומות בלוג עדיין.</p>}
              </ul>
            </section>
          </>
        )}
      </div>
      <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
