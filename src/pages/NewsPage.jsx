import { useEffect, useState } from 'react';
import { fetchAnnouncements } from '../lib/api';
import './NewsPage.css';

const SECTIONS = [
  { type: 'עדכון שוטף', title: '📢 עדכונים שוטפים' },
  { type: 'הנחיה קבועה', title: '📋 הנחיות קבועות' },
  { type: 'חדשות בקהילה', title: '📰 חדשות בקהילה' },
];

export default function NewsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(data.announcements);
      })
      .catch(() => {
        if (!cancelled) setError('לא הצלחנו לטעון את ההודעות. נסו לרענן את העמוד.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="news-page">
      <h1 className="news-page__title">הודעות | חדשות | עדכונים</h1>

      {loading && <p className="news-page__loading">טוען…</p>}
      {error && <p className="news-page__error">{error}</p>}

      {!loading &&
        !error &&
        SECTIONS.map((section) => {
          const items = announcements.filter((a) => a.type === section.type);
          if (items.length === 0) return null;
          return (
            <section key={section.type} className="news-page__section">
              <h2 className="news-page__section-title">{section.title}</h2>
              <div className="news-page__list">
                {items.map((a) => (
                  <article key={a.id} className={`news-card${a.pinned ? ' news-card--pinned' : ''}`}>
                    {a.pinned && <span className="news-card__pin">📌 נעוץ</span>}
                    <h3 className="news-card__title">{a.title}</h3>
                    {a.content && <p className="news-card__content">{a.content}</p>}
                  </article>
                ))}
              </div>
            </section>
          );
        })}

      {!loading && !error && announcements.length === 0 && (
        <p className="news-page__empty">אין הודעות להצגה כרגע.</p>
      )}
    </div>
  );
}
