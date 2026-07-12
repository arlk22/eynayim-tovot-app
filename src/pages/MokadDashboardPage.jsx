import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMokadReports, fetchMunicipalityFollowups, setMunicipalityResponse } from '../lib/api';
import MokadReportDetail from './MokadReportDetail';
import './MokadDashboardPage.css';

const STATUS_FILTERS = ['הכל', 'חדש', 'אומת', 'בטיפול', 'נסגר'];

const URGENCY_ICON = {
  'גבוהה': '🔴',
  'בינונית': '🟠',
  'נמוכה': '🟢',
};

const FORGOTTEN_DAYS_THRESHOLD = 7;

const SEGMENTS = [
  { key: 'needsVisit', label: 'דורש ביקור' },
  { key: 'forgotten', label: `נשכחים (${FORGOTTEN_DAYS_THRESHOLD}+ ימים)` },
  { key: 'transferred', label: 'הועבר לטיפול' },
];

const TABLE_COLUMNS = [
  { key: 'category', label: 'קטגוריה' },
  { key: 'subcategory', label: 'תת קטגוריה' },
  { key: 'address', label: 'כתובת' },
  { key: 'status', label: 'סטטוס' },
  { key: 'urgency', label: 'דחיפות' },
  { key: 'daysSinceReport', label: 'גיל דיווח' },
];

function isOpen(r) {
  return r.status !== 'נסגר';
}

function daysLabel(days) {
  if (days === null || days === undefined) return 'תאריך לא ידוע';
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}

function compareRows(a, b, key) {
  let va = a[key];
  let vb = b[key];
  if (key === 'daysSinceReport') {
    va = va ?? -1;
    vb = vb ?? -1;
  } else {
    va = va || '';
    vb = vb || '';
  }
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

export default function MokadDashboardPage() {
  const { mokadSession } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [segment, setSegment] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [streetFilter, setStreetFilter] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [view, setView] = useState('reports');
  const [followups, setFollowups] = useState([]);
  const [followupsLoading, setFollowupsLoading] = useState(true);
  const [followupsError, setFollowupsError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMokadReports(mokadSession.volunteerId, mokadSession.password)
      .then((data) => setReports(data.reports))
      .catch(() => setError('לא הצלחנו לטעון את הדיווחים.'))
      .finally(() => setLoading(false));
  }, [mokadSession]);

  const loadFollowups = useCallback(() => {
    setFollowupsLoading(true);
    setFollowupsError(null);
    fetchMunicipalityFollowups(mokadSession.volunteerId, mokadSession.password)
      .then((data) => setFollowups(data.followups))
      .catch(() => setFollowupsError('לא הצלחנו לטעון את הפניות.'))
      .finally(() => setFollowupsLoading(false));
  }, [mokadSession]);

  useEffect(() => {
    load();
    loadFollowups();
  }, [load, loadFollowups]);

  async function handleUpdateResponse(logEntryId, status) {
    if (!status) return;
    try {
      await setMunicipalityResponse(mokadSession.volunteerId, mokadSession.password, logEntryId, status);
      loadFollowups();
    } catch {
      setFollowupsError('עדכון הסטטוס נכשל, נסו שוב.');
    }
  }

  const segmentCounts = useMemo(
    () => ({
      needsVisit: reports.filter((r) => r.requiresVisit && isOpen(r)).length,
      forgotten: reports.filter((r) => isOpen(r) && r.daysSinceReport !== null && r.daysSinceReport >= FORGOTTEN_DAYS_THRESHOLD).length,
      transferred: reports.filter((r) => r.hasBeenForwarded).length,
    }),
    [reports]
  );

  const statusCounts = useMemo(() => {
    const counts = { הכל: reports.length };
    for (const r of reports) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [reports]);

  const categoryOptions = useMemo(
    () => [...new Set(reports.map((r) => r.category).filter(Boolean))].sort(),
    [reports]
  );
  const subcategoryOptions = useMemo(
    () =>
      [...new Set(
        reports
          .filter((r) => !categoryFilter || r.category === categoryFilter)
          .map((r) => r.subcategory)
          .filter(Boolean)
      )].sort(),
    [reports, categoryFilter]
  );
  const streetOptions = useMemo(
    () => [...new Set(reports.map((r) => r.address).filter(Boolean))].sort(),
    [reports]
  );

  function matchesSegment(r) {
    if (segment === 'needsVisit') return r.requiresVisit && isOpen(r);
    if (segment === 'forgotten') return isOpen(r) && r.daysSinceReport !== null && r.daysSinceReport >= FORGOTTEN_DAYS_THRESHOLD;
    if (segment === 'transferred') return r.hasBeenForwarded;
    return true;
  }

  const filtered = reports
    .filter((r) => statusFilter === 'הכל' || r.status === statusFilter)
    .filter(matchesSegment)
    .filter((r) => !categoryFilter || r.category === categoryFilter)
    .filter((r) => !subcategoryFilter || r.subcategory === subcategoryFilter)
    .filter((r) => !streetFilter || r.address === streetFilter);

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const cmp = compareRows(a, b, sortKey);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const hasActiveFilters = statusFilter !== 'הכל' || segment || categoryFilter || subcategoryFilter || streetFilter;

  function clearFilters() {
    setStatusFilter('הכל');
    setSegment(null);
    setCategoryFilter('');
    setSubcategoryFilter('');
    setStreetFilter('');
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="mokad-dash">
      <div className="mokad-dash__main">
        <h1 className="mokad-dash__title">🎧 אזור המוקד</h1>

        <div className="mokad-dash__tabs">
          <button
            type="button"
            className={`mokad-dash__tab${view === 'reports' ? ' mokad-dash__tab--active' : ''}`}
            onClick={() => setView('reports')}
          >
            רשימת דיווחים
          </button>
          <button
            type="button"
            className={`mokad-dash__tab${view === 'followups' ? ' mokad-dash__tab--active' : ''}`}
            onClick={() => setView('followups')}
          >
            מעקב פניות לעירייה{followups.length > 0 ? ` (${followups.length})` : ''}
          </button>
        </div>

        {view === 'followups' && (
          <div className="mokad-followups">
            {followupsLoading && <p className="mokad-dash__loading">טוען…</p>}
            {followupsError && <p className="mokad-dash__error">{followupsError}</p>}
            {!followupsLoading && !followupsError && followups.length === 0 && (
              <p className="mokad-dash__loading">אין פניות הממתינות למענה מהעירייה.</p>
            )}
            {!followupsLoading &&
              !followupsError &&
              followups.map((f) => (
                <div key={f.logEntryId} className="followup-card">
                  <div className="followup-card__header">
                    <span>
                      {f.category}
                      {f.reportNumber != null ? ` (#${f.reportNumber})` : ''}
                    </span>
                    <span className="followup-card__days">
                      {f.daysSinceSent != null ? `${f.daysSinceSent} ימים ללא מענה` : ''}
                    </span>
                  </div>
                  <p className="followup-card__address">{f.address}</p>
                  {f.forwardedTo && <p className="followup-card__forwarded">הועבר ל: {f.forwardedTo}</p>}
                  <div className="followup-card__actions">
                    <select
                      className="mokad-dash__select"
                      value=""
                      onChange={(e) => handleUpdateResponse(f.logEntryId, e.target.value)}
                    >
                      <option value="">עדכן סטטוס מענה…</option>
                      <option value="נענה">נענה</option>
                      <option value="טופל">טופל</option>
                      <option value="נדחה">נדחה</option>
                    </select>
                    {f.reportId && (
                      <button
                        type="button"
                        className="mokad-dash__clear-filters"
                        onClick={() => setSelectedReportId(f.reportId)}
                      >
                        פתח דיווח
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {view === 'reports' && (
        <>
        <div className="mokad-dash__tiles">
          <div className="mokad-dash__tile mokad-dash__tile--total">
            <span className="mokad-dash__tile-number">{reports.length}</span>
            <span className="mokad-dash__tile-label">סה"כ מפגעים</span>
          </div>
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`mokad-dash__tile${segment === s.key ? ' mokad-dash__tile--active' : ''}`}
              onClick={() => setSegment(segment === s.key ? null : s.key)}
            >
              <span className="mokad-dash__tile-number">{segmentCounts[s.key]}</span>
              <span className="mokad-dash__tile-label">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="mokad-dash__filters">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={`mokad-dash__filter${statusFilter === s ? ' mokad-dash__filter--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s} ({statusCounts[s] || 0})
            </button>
          ))}
        </div>

        <div className="mokad-dash__selects">
          <select
            className="mokad-dash__select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter('');
            }}
          >
            <option value="">כל הקטגוריות</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="mokad-dash__select"
            value={subcategoryFilter}
            onChange={(e) => setSubcategoryFilter(e.target.value)}
          >
            <option value="">כל תתי הקטגוריה</option>
            {subcategoryOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="mokad-dash__select"
            value={streetFilter}
            onChange={(e) => setStreetFilter(e.target.value)}
          >
            <option value="">כל הרחובות</option>
            {streetOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button type="button" className="mokad-dash__clear-filters" onClick={clearFilters}>
              נקה סינון
            </button>
          )}
        </div>

        {loading && <p className="mokad-dash__loading">טוען…</p>}
        {error && <p className="mokad-dash__error">{error}</p>}

        {!loading && !error && sorted.length === 0 && (
          <p className="mokad-dash__loading">אין דיווחים בחיתוך הזה.</p>
        )}

        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="mokad-dash__list">
              {sorted.map((r) => (
                <div
                  key={r.id}
                  className="report-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedReportId(r.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedReportId(r.id)}
                >
                  {r.photoUrl && <img src={r.photoUrl} alt="" className="report-card__photo" />}
                  <div className="report-card__body">
                    <div className="report-card__header">
                      <span className="report-card__category">
                        {URGENCY_ICON[r.urgency] || ''} {r.category}
                        {r.subcategory ? ` — ${r.subcategory}` : ''}
                      </span>
                      <span className="report-card__status" data-status={r.status}>
                        {r.status}
                      </span>
                    </div>
                    <p className="report-card__address">{r.address}</p>
                    {r.description && <p className="report-card__description">{r.description}</p>}
                    <div className="report-card__footer">
                      <span>{daysLabel(r.daysSinceReport)}</span>
                      {r.reporterName && <span>מדווח: {r.reporterName}</span>}
                      {r.hasVerifyingPatrol && <span className="report-card__attached">✓ מוצמד לסיור</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mokad-dash__table-wrap">
              <table className="mokad-dash__table">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.key}>
                        <button type="button" className="mokad-dash__th-btn" onClick={() => handleSort(col.key)}>
                          {col.label}
                          {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id} onClick={() => setSelectedReportId(r.id)}>
                      <td>{r.category}</td>
                      <td>{r.subcategory}</td>
                      <td>{r.address}</td>
                      <td>
                        <span className="report-card__status" data-status={r.status}>
                          {r.status}
                        </span>
                      </td>
                      <td>{URGENCY_ICON[r.urgency] || ''}</td>
                      <td>{daysLabel(r.daysSinceReport)}</td>
                      <td>
                        {r.requiresVisit && <span title="דורש ביקור">📍</span>}
                        {r.hasBeenForwarded && <span title="הועבר לטיפול">📲</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        </>
        )}
      </div>

      {selectedReportId ? (
        <MokadReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onChanged={load}
        />
      ) : (
        <div className="mokad-dash__empty-detail">בחר/י דיווח מהרשימה כדי לראות פרטים</div>
      )}
    </div>
  );
}
