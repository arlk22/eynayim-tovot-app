import { useEffect, useState } from 'react';
import { fetchPublicStats } from '../lib/api';
import './CommunityPage.css';

const VOLUNTEER_SIGNUP_URL = 'https://gdform1.fillout.com/t/suT19RTEyUus';
const RESIDENT_HAZARD_URL = 'https://gdform1.fillout.com/t/iNWkw3m1EGus';

const STATUS_ORDER = ['חדש', 'אומת', 'בטיפול', 'נסגר'];
const STATUS_LABEL = {
  'חדש': 'דווח',
  'אומת': 'אומת בשטח',
  'בטיפול': 'בטיפול',
  'נסגר': 'טופל וסגור',
};

export default function CommunityPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError('לא הצלחנו לטעון את הנתונים כרגע.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxStatusCount = stats
    ? Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s] || 0))
    : 1;
  const maxCategoryCount = stats?.byCategory?.length
    ? Math.max(...stats.byCategory.map((c) => c.count))
    : 1;

  return (
    <div className="community-page">
      <span className="community-page__icon" aria-hidden="true">
        👁️
      </span>
      <h1 className="community-page__title">עיניים טובות – קהילת הדר</h1>
      <p className="community-page__intro">
        מתנדבים תושבי השכונה יוצאים לסיורים קבועים, שומרים עין על הרחובות, ומדווחים על
        מפגעים כדי לשמור על הדר מקום נעים וטוב יותר לחיות בו. הנתונים כאן מתעדכנים
        אוטומטית ומשקפים את הפעילות בפועל.
      </p>

      {loading && <p className="community-page__loading">טוען נתונים…</p>}
      {error && <p className="community-page__error">{error}</p>}

      {stats && (
        <>
          <div className="community-page__headline">
            <div className="community-page__stat">
              <span className="community-page__stat-number">{stats.totalReports}</span>
              <span className="community-page__stat-label">דיווחי מפגעים בסך הכל</span>
            </div>
            <div className="community-page__stat">
              <span className="community-page__stat-number">{stats.resolvedPercent}%</span>
              <span className="community-page__stat-label">מהדיווחים טופלו וסגורים</span>
            </div>
          </div>

          <section className="community-page__section">
            <h2>סטטוס הדיווחים</h2>
            <div className="community-page__bars">
              {STATUS_ORDER.map((s) => {
                const count = stats.byStatus[s] || 0;
                const pct = Math.round((count / maxStatusCount) * 100);
                return (
                  <div key={s} className="community-page__bar-row">
                    <span className="community-page__bar-label">{STATUS_LABEL[s]}</span>
                    <div className="community-page__bar-track">
                      <div className="community-page__bar-fill" data-status={s} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="community-page__bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {stats.byCategory.length > 0 && (
            <section className="community-page__section">
              <h2>דיווחים לפי קטגוריה</h2>
              <div className="community-page__bars">
                {stats.byCategory.map((c) => {
                  const pct = Math.round((c.count / maxCategoryCount) * 100);
                  return (
                    <div key={c.name} className="community-page__bar-row">
                      <span className="community-page__bar-label">{c.name}</span>
                      <div className="community-page__bar-track">
                        <div className="community-page__bar-fill community-page__bar-fill--category" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="community-page__bar-count">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <section className="community-page__cta">
        <a href={VOLUNTEER_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="community-page__cta-btn">
          🤝 הצטרפו כמתנדבים
        </a>
        <a href={RESIDENT_HAZARD_URL} target="_blank" rel="noopener noreferrer" className="community-page__cta-btn community-page__cta-btn--secondary">
          🟡 דווחו על מפגע
        </a>
      </section>
    </div>
  );
}
