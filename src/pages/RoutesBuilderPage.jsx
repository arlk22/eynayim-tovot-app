import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRoutes, saveRoute } from '../lib/api';
import './RoutesBuilderPage.css';

const EMPTY_FORM = { routeId: null, name: '', streets: ['', ''], customLink: '' };

function buildAutoLink(streets) {
  const clean = streets.map((s) => s.trim()).filter(Boolean);
  if (clean.length < 2) return null;
  return `https://www.google.com/maps/dir/${clean.map((s) => encodeURIComponent(`${s}, חיפה`)).join('/')}`;
}

export default function RoutesBuilderPage() {
  const { coordinatorSession } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRoutes(coordinatorSession.volunteerId, coordinatorSession.password)
      .then((data) => setRoutes(data.routes))
      .catch(() => setError('לא הצלחנו לטעון את רשימת המסלולים.'))
      .finally(() => setLoading(false));
  }, [coordinatorSession]);

  useEffect(() => {
    load();
  }, [load]);

  function updateStreet(index, value) {
    setForm((f) => {
      const streets = [...f.streets];
      streets[index] = value;
      return { ...f, streets };
    });
  }

  function addStreet() {
    setForm((f) => ({ ...f, streets: [...f.streets, ''] }));
  }

  function removeStreet(index) {
    setForm((f) => ({ ...f, streets: f.streets.filter((_, i) => i !== index) }));
  }

  function moveStreet(index, delta) {
    setForm((f) => {
      const streets = [...f.streets];
      const target = index + delta;
      if (target < 0 || target >= streets.length) return f;
      [streets[index], streets[target]] = [streets[target], streets[index]];
      return { ...f, streets };
    });
  }

  function editRoute(route) {
    const streets = route.streets.length ? route.streets : ['', ''];
    const autoLink = buildAutoLink(streets);
    // A saved link that differs from what the streets alone would generate means
    // it was manually corrected in Google Maps (e.g. by dragging the route line) — preserve it.
    const customLink = route.link && route.link !== autoLink ? route.link : '';
    setForm({ routeId: route.id, name: route.name, streets, customLink });
    setError(null);
  }

  function newRoute() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  const cleanStreets = form.streets.map((s) => s.trim()).filter(Boolean);
  const customLink = form.customLink.trim();
  const autoLink = buildAutoLink(form.streets);

  async function handleSave() {
    if (!form.name.trim() || cleanStreets.length < 2) {
      setError('יש להזין שם למסלול ולפחות שני רחובות.');
      return;
    }
    if (customLink && !/^https?:\/\//.test(customLink)) {
      setError('הקישור המותאם אישית חייב להתחיל ב-http:// או https://');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveRoute(coordinatorSession.volunteerId, coordinatorSession.password, {
        routeId: form.routeId,
        name: form.name.trim(),
        streets: cleanStreets,
        customLink: customLink || undefined,
      });
      newRoute();
      await load();
    } catch {
      setError('השמירה נכשלה, נסו שוב.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="routes-builder">
      <h1 className="routes-builder__title">🗺️ מסלולי סיור</h1>
      <p className="routes-builder__intro">
        בנו מסלול קבוע לפי סדר רחובות, וקבלו קישור לניווט הליכה בגוגל מפות שניתן לשמור ולחזור עליו.
      </p>

      <div className="routes-builder__form">
        <h2 className="routes-builder__form-title">{form.routeId ? 'עריכת מסלול' : 'מסלול חדש'}</h2>

        <label className="routes-builder__label">
          שם המסלול
          <input
            type="text"
            className="routes-builder__input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="לדוגמה: מסלול הרצל-ארלוזורוב"
          />
        </label>

        <div className="routes-builder__streets">
          {form.streets.map((street, i) => (
            <div key={i} className="routes-builder__street-row">
              <span className="routes-builder__street-index">{i + 1}</span>
              <input
                type="text"
                className="routes-builder__input"
                value={street}
                onChange={(e) => updateStreet(i, e.target.value)}
                placeholder="שם רחוב, או לדיוק: 'שם רחוב 5' / 'רחוב פינת רחוב'"
              />
              <button
                type="button"
                className="routes-builder__icon-btn"
                onClick={() => moveStreet(i, -1)}
                disabled={i === 0}
                aria-label="הזז למעלה"
              >
                ↑
              </button>
              <button
                type="button"
                className="routes-builder__icon-btn"
                onClick={() => moveStreet(i, 1)}
                disabled={i === form.streets.length - 1}
                aria-label="הזז למטה"
              >
                ↓
              </button>
              <button
                type="button"
                className="routes-builder__icon-btn routes-builder__icon-btn--danger"
                onClick={() => removeStreet(i)}
                disabled={form.streets.length <= 2}
                aria-label="הסר רחוב"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="routes-builder__add-street" onClick={addStreet}>
          + הוספת רחוב
        </button>

        <p className="routes-builder__tip">
          💡 טיפ: אם הקישור לוקח את המסלול בכיוון לא הגיוני או עם עיקוף מיותר, זה כי גוגל מפות בחר נקודה כלשהי
          על הרחוב שאינה בדיוק הפינה שרציתם. כדי לקבע את נקודת הפנייה המדויקת, הוסיפו מספר בית (למשל: "שמריהו לוין 5")
          או ציינו את הפינה (למשל: "אחד העם פינת שמריהו לוין") במקום שם רחוב בלבד.
        </p>

        {autoLink && (
          <a href={autoLink} target="_blank" rel="noopener noreferrer" className="routes-builder__preview-link">
            🔗 תצוגה מקדימה של המסלול בגוגל מפות
          </a>
        )}

        <label className="routes-builder__label">
          קישור מותאם אישית (אופציונלי)
          <input
            type="url"
            className="routes-builder__input"
            value={form.customLink}
            onChange={(e) => setForm((f) => ({ ...f, customLink: e.target.value }))}
            placeholder="הדביקו כאן קישור אחרי תיקון ידני בגוגל מפות"
          />
        </label>
        <p className="routes-builder__tip">
          💡 אם הכיוון עדיין לא נכון: פתחו את הקישור למעלה, גררו את הקו הכחול בגוגל מפות כדי לתקן את הנתיב בפועל,
          לחצו על "אפשרויות" ← "העתקת הקישור", והדביקו אותו כאן. הקישור הזה יישמר במקום זה שנוצר אוטומטית מרשימת הרחובות.
        </p>

        {error && <p className="routes-builder__error">{error}</p>}

        <div className="routes-builder__form-actions">
          <button type="button" className="routes-builder__save" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר…' : form.routeId ? 'עדכון מסלול' : 'שמירת מסלול'}
          </button>
          {form.routeId && (
            <button type="button" className="routes-builder__cancel" onClick={newRoute}>
              ביטול עריכה
            </button>
          )}
        </div>
      </div>

      <h2 className="routes-builder__list-title">מסלולים קיימים</h2>
      {loading && <p className="routes-builder__loading">טוען…</p>}
      {!loading && routes.length === 0 && <p className="routes-builder__loading">עדיין לא נוצרו מסלולים.</p>}
      <div className="routes-builder__list">
        {routes.map((r) => (
          <div key={r.id} className="route-card">
            <div className="route-card__header">
              <strong>{r.name}</strong>
              <button type="button" className="route-card__edit" onClick={() => editRoute(r)}>
                עריכה
              </button>
            </div>
            <p className="route-card__streets">{r.streets.join(' ← ')}</p>
            {r.link && (
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="route-card__link">
                🔗 פתיחה בגוגל מפות
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
