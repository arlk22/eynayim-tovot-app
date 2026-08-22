import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRoutes, fetchStreets, saveRoute } from '../lib/api';
import './RoutesBuilderPage.css';

const EMPTY_FORM = { routeId: null, name: '', streets: ['', ''], customLink: '', directionsText: '', meetingPoint: '' };
const ZONE_LABELS = { 1: 'אזור 1', 2: 'אזור 2', 3: 'אזור 3', 4: 'אזור 4' };

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
  const [streetsCatalog, setStreetsCatalog] = useState([]);
  const [zoneFilter, setZoneFilter] = useState('');

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

  useEffect(() => {
    fetchStreets(coordinatorSession.volunteerId, coordinatorSession.password)
      .then((data) => setStreetsCatalog(data.streets))
      .catch(() => setStreetsCatalog([]));
  }, [coordinatorSession]);

  // Group streets by their first zone so the picker can show <optgroup> per
  // area (a street tagged with several zones just appears under the first).
  const streetsByZone = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    const other = [];
    for (const s of streetsCatalog) {
      const zone = s.zones?.[0];
      if (groups[zone]) groups[zone].push(s.name);
      else other.push(s.name);
    }
    for (const zone of Object.keys(groups)) {
      groups[zone].sort((a, b) => a.localeCompare(b, 'he'));
    }
    other.sort((a, b) => a.localeCompare(b, 'he'));
    return { groups, other };
  }, [streetsCatalog]);

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
    setForm({
      routeId: route.id,
      name: route.name,
      streets,
      customLink,
      directionsText: route.directionsText || '',
      meetingPoint: route.meetingPoint || '',
    });
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
        directionsText: form.directionsText.trim() || undefined,
        meetingPoint: form.meetingPoint.trim() || undefined,
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

        <label className="routes-builder__label">
          נקודת מפגש ליציאה לסיור (אופציונלי)
          <input
            type="text"
            className="routes-builder__input"
            value={form.meetingPoint}
            onChange={(e) => setForm((f) => ({ ...f, meetingPoint: e.target.value }))}
            placeholder="לדוגמה: פינת הרצל/יונה, ליד הפרחייה"
          />
        </label>

        <label className="routes-builder__label">
          הוראות הליכה בטקסט (אופציונלי)
          <textarea
            className="routes-builder__textarea"
            value={form.directionsText}
            onChange={(e) => setForm((f) => ({ ...f, directionsText: e.target.value }))}
            placeholder={'לדוגמה:\nכיכר מסריק\nלכו אל הנביאים\nפנו ימינה אל יונה\n...'}
            rows={6}
          />
        </label>
        <p className="routes-builder__tip">
          💡 בגוגל מפות, בפאנל ההוראות בצד (לחיצה על "פרטים") מופיע בדיוק הטקסט הזה — עם שמות רחובות ו"פנו
          ימינה/שמאלה" בכל צומת. פשוט מעתיקים אותו משם ומדביקים כאן, כדי שהמתנדבים יראו הוראות הליכה מדויקות בלי
          לצאת מהאפליקציה.
        </p>

        <label className="routes-builder__label">
          הצג רחובות מאזור
          <select
            className="routes-builder__input"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">הכל (כל האזורים)</option>
            {[1, 2, 3, 4].map((zone) => (
              <option key={zone} value={zone}>
                {ZONE_LABELS[zone]}
              </option>
            ))}
          </select>
        </label>

        <div className="routes-builder__streets">
          {form.streets.map((street, i) => {
            // Keep the row's current pick visible even if it falls outside the
            // active zone filter — switching the filter shouldn't blank out
            // streets already chosen in a different area.
            const currentZone = zoneFilter
              ? streetsCatalog.find((s) => s.name === street)?.zones?.[0]
              : null;
            const showCurrentSeparately = zoneFilter && street && currentZone !== zoneFilter;
            return (
              <div key={i} className="routes-builder__street-row">
                <span className="routes-builder__street-index">{i + 1}</span>
                <select
                  className="routes-builder__input routes-builder__street-select"
                  value={street}
                  onChange={(e) => updateStreet(i, e.target.value)}
                >
                  <option value="">בחרו רחוב…</option>
                  {showCurrentSeparately && (
                    <optgroup label="נבחר כרגע">
                      <option value={street}>{street}</option>
                    </optgroup>
                  )}
                  {!zoneFilter && streetsByZone.other.length > 0 && (
                    <optgroup label="ללא אזור">
                      {streetsByZone.other.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(zoneFilter ? [Number(zoneFilter)] : [1, 2, 3, 4]).map(
                    (zone) =>
                      streetsByZone.groups[zone].length > 0 && (
                        <optgroup key={zone} label={ZONE_LABELS[zone]}>
                          {streetsByZone.groups[zone].map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </optgroup>
                      )
                  )}
                </select>
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
            );
          })}
        </div>

        <button type="button" className="routes-builder__add-street" onClick={addStreet}>
          + הוספת רחוב
        </button>

        <p className="routes-builder__tip">
          💡 טיפ: הרחובות ברשימה תואמים בדיוק לשמות בגוגל מפות, כדי שהמסלול לא ישתבש. אם הקישור עדיין
          לוקח בכיוון לא הגיוני או עם עיקוף מיותר, אפשר לקבע את נקודת הפנייה המדויקת בשדה "קישור מותאם אישית" למטה.
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
            {r.meetingPoint && <p className="route-card__streets">📍 נקודת מפגש: {r.meetingPoint}</p>}
            {r.link && (
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="route-card__link">
                🔗 פתיחה בגוגל מפות
              </a>
            )}
            {r.directionsText && (
              <details className="route-card__directions">
                <summary>📋 הוראות הליכה</summary>
                <pre>{r.directionsText}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
