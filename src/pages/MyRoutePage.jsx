import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMyLedPatrols, saveOwnRoute } from '../lib/api';
import './MyRoutePage.css';

const ZONE_OPTIONS = [
  { value: '1', label: 'אזור 1' },
  { value: '2', label: 'אזור 2' },
  { value: '3', label: 'אזור 3' },
  { value: '4', label: 'אזור 4' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export default function MyRoutePage() {
  const { volunteer } = useAuth();
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatrolId, setSelectedPatrolId] = useState(null);
  const [directionsText, setDirectionsText] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMyLedPatrols(volunteer.id)
      .then((data) => setPatrols(data.patrols))
      .catch(() => setError('לא הצלחנו לטעון את הסיורים שאתם מובילים.'))
      .finally(() => setLoading(false));
  }, [volunteer]);

  useEffect(() => {
    load();
  }, [load]);

  function selectPatrol(patrol) {
    setSelectedPatrolId(patrol.patrolId);
    setDirectionsText(patrol.directionsText || '');
    setZone(patrol.zone || '');
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    if (!directionsText.trim()) {
      setError('יש לכתוב את הוראות ההליכה לפני השמירה.');
      return;
    }
    if (!zone) {
      setError('יש לבחור אזור לפני השמירה.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveOwnRoute(volunteer.id, selectedPatrolId, directionsText.trim(), zone);
      setSaved(true);
      await load();
    } catch {
      setError('השמירה נכשלה, נסו שוב.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="my-route">
      <h1 className="my-route__title">🧭 קביעת מסלול לסיור שלי</h1>
      <p className="my-route__intro">
        אם אתם מובילים סיור, תוכלו כאן לכתוב את סדר הרחובות וכיוון ההליכה, כדי שהמצטרפים לסיור שלכם ידעו למה לצפות.
      </p>

      {loading && <p className="my-route__loading">טוען…</p>}
      {error && <p className="my-route__error">{error}</p>}

      {!loading && patrols.length === 0 && (
        <p className="my-route__empty">לא נמצאו סיורים קרובים שבהם אתם רשומים כמובילים.</p>
      )}

      {!loading && patrols.length > 0 && (
        <div className="my-route__patrols">
          {patrols.map((p) => (
            <button
              key={p.patrolId}
              type="button"
              className={`my-route__patrol-btn${selectedPatrolId === p.patrolId ? ' my-route__patrol-btn--active' : ''}`}
              onClick={() => selectPatrol(p)}
            >
              {p.dayOfWeek} {formatDate(p.date)}, {p.startTime}
              {p.directionsText ? ' ✓' : ''}
            </button>
          ))}
        </div>
      )}

      {selectedPatrolId && (
        <div className="my-route__editor">
          <label className="my-route__label">
            אזור הסיור
            <select
              className="my-route__select"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">בחרו אזור…</option>
              {ZONE_OPTIONS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </label>
          <p className="my-route__tip">
            למתנדבים יוצגו הוראות ההליכה שכתבתם, וגם רשימת הרחובות הכללית של האזור שבחרתם — כדי שיידעו למה לצפות גם בלי מסלול מסודר.
          </p>

          <label className="my-route__label">
            הוראות הליכה (סדר רחובות, פניות ימינה/שמאלה)
            <textarea
              className="my-route__textarea"
              value={directionsText}
              onChange={(e) => {
                setDirectionsText(e.target.value);
                setSaved(false);
              }}
              placeholder={'לדוגמה:\nכיכר מסריק\nלכו אל הנביאים\nפנו ימינה אל יונה\n...'}
              rows={8}
            />
          </label>
          <button type="button" className="my-route__save" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר…' : saved ? '✓ נשמר' : 'שמירה'}
          </button>
        </div>
      )}
    </div>
  );
}
