import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMokadReports } from '../lib/api';
import MokadReportDetail from './MokadReportDetail';
import './MokadDashboardPage.css';

const STATUS_FILTERS = ['הכל', 'חדש', 'אומת', 'בטיפול', 'נסגר'];

const URGENCY_ICON = {
  'גבוהה': '🔴',
  'בינונית': '🟠',
  'נמוכה': '🟢',
};

function daysLabel(days) {
  if (days === null || days === undefined) return 'תאריך לא ידוע';
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}

export default function MokadDashboardPage() {
  const { mokadSession } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [selectedReportId, setSelectedReportId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMokadReports(mokadSession.volunteerId, mokadSession.password)
      .then((data) => setReports(data.reports))
      .catch(() => setError('לא הצלחנו לטעון את הדיווחים.'))
      .finally(() => setLoading(false));
  }, [mokadSession]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = statusFilter === 'הכל' ? reports : reports.filter((r) => r.status === statusFilter);

  return (
    <div className="mokad-dash">
      <h1 className="mokad-dash__title">🎧 אזור המוקד</h1>

      <div className="mokad-dash__filters">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`mokad-dash__filter${statusFilter === s ? ' mokad-dash__filter--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="mokad-dash__loading">טוען…</p>}
      {error && <p className="mokad-dash__error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="mokad-dash__loading">אין דיווחים בסטטוס הזה.</p>
      )}

      {!loading && !error && (
        <div className="mokad-dash__list">
          {filtered.map((r) => (
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
                <p className="report-card__address">
                  {r.address}
                  {r.houseNumber ? ` ${r.houseNumber}` : ''}
                </p>
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
      )}

      {selectedReportId && (
        <MokadReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
