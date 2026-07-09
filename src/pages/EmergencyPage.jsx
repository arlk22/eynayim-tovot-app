import { useEffect, useState } from 'react';
import { fetchEmergencyContacts } from '../lib/api';
import './EmergencyPage.css';

export default function EmergencyPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmergencyContacts()
      .then((data) => {
        if (!cancelled) setContacts(data.contacts);
      })
      .catch(() => {
        if (!cancelled) setError('לא הצלחנו לטעון את מספרי החירום. נסו לרענן את העמוד.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="emergency-page">
      <h1 className="emergency-page__title">☎️ מספרי חירום</h1>

      {loading && <p className="emergency-page__loading">טוען…</p>}
      {error && <p className="emergency-page__error">{error}</p>}
      {!loading && !error && contacts.length === 0 && (
        <p className="emergency-page__empty">אין מספרי חירום להצגה כרגע.</p>
      )}

      <div className="emergency-page__list">
        {contacts.map((c) => (
          <a key={c.id} href={`tel:${c.phone}`} className="emergency-card">
            <span className="emergency-card__icon" aria-hidden="true">
              📞
            </span>
            <span className="emergency-card__info">
              <span className="emergency-card__name">{c.name}</span>
              <span className="emergency-card__phone">{c.phone}</span>
            </span>
            <span className="emergency-card__call">התקשרו</span>
          </a>
        ))}
      </div>
    </div>
  );
}
