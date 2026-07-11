import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchHomeStats, fetchReminders } from '../lib/api';
import { countUnseen } from '../lib/seenAnnouncements';
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

function countLabel(n, singular, plural) {
  return n === 1 ? singular : `${n} ${plural}`;
}

export default function HomePage() {
  const { volunteer } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState('eynayim');
  const [unseenCount, setUnseenCount] = useState(0);
  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHomeStats(volunteer?.id)
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setUnseenCount(countUnseen(data.announcements || []));
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
  }, [volunteer?.id]);

  useEffect(() => {
    if (!volunteer?.id) return;
    let cancelled = false;
    fetchReminders(volunteer.id)
      .then((data) => {
        if (!cancelled) setReminders(data.reminders || []);
      })
      .catch(() => {
        if (!cancelled) setReminders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [volunteer?.id]);

  const pinned = stats?.announcements?.find((a) => a.pinned) || stats?.announcements?.[0];
  const hasNotifications = unseenCount > 0 || reminders.length > 0;

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

      {hasNotifications && (
        <p className="home-page__notify">
          יש לך{' '}
          {unseenCount > 0 && (
            <button type="button" className="home-page__notify-link" onClick={() => navigate('/news')}>
              {countLabel(unseenCount, 'הודעה חדשה אחת', 'הודעות חדשות')}
            </button>
          )}
          {unseenCount > 0 && reminders.length > 0 && ' ו-'}
          {reminders.length > 0 && (
            <button type="button" className="home-page__notify-link" onClick={() => setShowReminders(true)}>
              {countLabel(reminders.length, 'תזכורת אחת', 'תזכורות')}
            </button>
          )}
        </p>
      )}

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
                ? stats.nextPatrol.isMine
                  ? `הסיור הבא שלך: ${stats.nextPatrol.routeName ? `${stats.nextPatrol.routeName}, ` : ''}${formatPatrolDate(stats.nextPatrol.date)}, ${stats.nextPatrol.startTime || ''}`
                  : `הסיור הבא: ${formatPatrolDate(stats.nextPatrol.date)}, ${stats.nextPatrol.startTime || ''}`
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

      {volunteer?.isMokad && (
        <button type="button" className="home-page__coordinator-link" onClick={() => navigate('/mokad')}>
          🎧 אזור המוקד
        </button>
      )}

      {showReminders && (
        <div className="home-page__popup-backdrop" onClick={() => setShowReminders(false)}>
          <div className="home-page__popup" onClick={(e) => e.stopPropagation()}>
            <h2>התזכורות שלך</h2>
            <ul className="home-page__reminder-list">
              {reminders.map((r) => (
                <li key={r.id}>
                  מחר{r.routeName ? ` — מסלול ${r.routeName}` : ''}, {r.startTime}
                  {r.endTime ? `-${r.endTime}` : ''}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setShowReminders(false)}>
              הבנתי
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
