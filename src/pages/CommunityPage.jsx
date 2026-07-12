import { useEffect, useState } from 'react';
import { fetchPublicStats } from '../lib/api';
import HazardStatsCharts from '../components/HazardStatsCharts';
import './CommunityPage.css';

const VOLUNTEER_SIGNUP_URL = 'https://gdform1.fillout.com/t/suT19RTEyUus';
const RESIDENT_HAZARD_URL = 'https://gdform1.fillout.com/t/iNWkw3m1EGus';

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

      <HazardStatsCharts stats={stats} />

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
