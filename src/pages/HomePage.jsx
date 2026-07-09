import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchHomeStats } from '../lib/api';
import Card from '../components/Card';
import './HomePage.css';

const COMMUNITIES = [
  { id: 'matnasim', label: 'החברה למתנ"סים', logo: '/logos/matnasim.png' },
  { id: 'eynayim', label: 'עיניים טובות', logo: '/logos/eynayim-tovot.png' },
  { id: 'minhelet', label: 'המינהלת העירונית רובע הדר', logo: '/logos/minhelet-hadar.png' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'לילה טוב';
  if (hour < 12) return 'בוקר טוב';
  if (hour < 18) return 'צהריים טובים';
  return 'ערב טוב';
}

function formatPatrolDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

export default function HomePage() {
  const { volunteer } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState('eynayim');

  useEffect(() => {
    let cancelled = false;
    fetchHomeStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pinned = stats?.announcements?.find((a) => a.pinned) || stats?.announcements?.[0];

  return (
    <div className="home-page">
      <div className="home-page__switcher">
        {COMMUNITIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`home-page__switcher-btn${community === c.id ? ' home-page__switcher-btn--active' : ''}`}
            onClick={() => setCommunity(c.id)}
            aria-label={c.label}
            title={c.label}
          >
            <img src={c.logo} alt={c.label} className="home-page__switcher-logo" />
          </button>
        ))}
      </div>

      <h1 className="home-page__title">קהילת הדר – עיניים טובות</h1>
      <p className="home-page__greeting">
        {greeting()}{volunteer?.name ? `, ${volunteer.name}` : ''}
      </p>

      <div className="home-page__stats">
        <div className="home-page__stat">
          <span className="home-page__stat-icon">👥</span>
          <span>
            {loading ? '…' : stats?.activeVolunteerCount ?? '—'} מתנדבים פעילים
          </span>
        </div>
        <div className="home-page__stat">
          <span className="home-page__stat-icon">📅</span>
          <span>
            {loading
              ? '…'
              : stats?.nextPatrol
                ? `הסיור הבא: ${formatPatrolDate(stats.nextPatrol.date)}, ${stats.nextPatrol.startTime || ''}`
                : 'אין סיור קרוב מתוזמן'}
          </span>
        </div>
      </div>

      {pinned && (
        <div className="home-page__ticker">
          <strong>{pinned.title}</strong>
          {pinned.content ? ` — ${pinned.content}` : ''}
        </div>
      )}

      <div className="home-page__grid">
        <Card
          icon="🤝"
          title="הצטרפות לסיורים"
          accent="mint"
          onClick={() => navigate('/patrols')}
        />
        <Card
          icon="🟠"
          title="דיווח אירוע"
          accent="peach"
          onClick={() => navigate('/report-event')}
        />
        <Card
          icon="🟡"
          title="דיווח מפגע"
          accent="yellow"
          onClick={() => navigate('/report-hazard')}
        />
        <Card
          icon="📢"
          title="הודעות ועדכונים"
          accent="lavender"
          onClick={() => navigate('/news')}
        />
        <Card
          icon="☎️"
          title="מספרי חירום"
          accent="rose"
          onClick={() => navigate('/emergency')}
        />
        <Card
          icon="🏠"
          title="שתפו תושב"
          accent="blue"
          onClick={() => navigate('/share')}
        />
      </div>

      {volunteer?.isCoordinator && (
        <button type="button" className="home-page__coordinator-link" onClick={() => navigate('/coordinator')}>
          🔐 אזור הרכז
        </button>
      )}
    </div>
  );
}
