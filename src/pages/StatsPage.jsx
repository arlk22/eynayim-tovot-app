import { useEffect, useState } from 'react';
import { fetchPublicStats } from '../lib/api';
import HazardStatsCharts from '../components/HazardStatsCharts';
import './StatsPage.css';

export default function StatsPage() {
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
    <div className="stats-page">
      <span className="stats-page__icon" aria-hidden="true">
        📊
      </span>
      <h1 className="stats-page__title">נתונים והשפעה</h1>
      <p className="stats-page__intro">
        סיכום הפעילות שלכם ושל שאר המתנדבים ב"עיניים טובות" — אותם נתונים שרואה הציבור
        בעמוד הקהילתי, כאן במקום אחד בשבילכם.
      </p>

      {loading && <p className="stats-page__loading">טוען נתונים…</p>}
      {error && <p className="stats-page__error">{error}</p>}

      <HazardStatsCharts stats={stats} />
    </div>
  );
}
