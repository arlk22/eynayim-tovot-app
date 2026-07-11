import { useState } from 'react';
import './SharePage.css';

const VOLUNTEER_SIGNUP_URL = 'https://gdform1.fillout.com/t/suT19RTEyUus';
const RESIDENT_HAZARD_URL = 'https://gdform1.fillout.com/t/iNWkw3m1EGus';

const VOLUNTEER_MESSAGE = `שלום! מחפשים מתנדבים נוספים ל"עיניים טובות" בהדר — סיורי שכונה קלים ומשמעותיים. מי שחושב/ת שיוכל/תוכל להתמיד מוזמן/ת להירשם כאן: ${VOLUNTEER_SIGNUP_URL}`;
const HAZARD_MESSAGE = `שלום! אפשר לדווח על מפגע בשכונה בקלות דרך הקישור הזה: ${RESIDENT_HAZARD_URL}`;

function ShareCard({ title, hint, url, message }) {
  const [copied, setCopied] = useState(false);

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the link is still shown on screen to copy manually
    }
  }

  return (
    <div className="share-page__card">
      <h2 className="share-page__card-title">{title}</h2>
      <p className="share-page__hint">{hint}</p>

      <button type="button" className="share-page__whatsapp" onClick={shareWhatsApp}>
        📱 שיתוף ב-WhatsApp
      </button>

      <button type="button" className="share-page__copy" onClick={copyLink}>
        {copied ? '✓ הקישור הועתק' : '🔗 העתקת קישור'}
      </button>

      <p className="share-page__link">{url}</p>
    </div>
  );
}

export default function SharePage() {
  return (
    <div className="share-page">
      <span className="share-page__icon" aria-hidden="true">
        🏠
      </span>
      <h1 className="share-page__title">שתפו תושב</h1>
      <p className="share-page__intro">
        תודה על פעילות ההתנדבות שלכם — רוח טובה זו יכולה להדביק תושבים נוספים. שני
        הטפסים הבאים אפשר לשתף ישירות מהמכשיר שלכם.
      </p>

      <ShareCard
        title="🤝 גיוס מתנדבים"
        hint='מכירים מישהו/י שיתמיד ויעריך את התרומה לפעילויות ב"עיניים טובות"? שתפו את טופס ההרשמה.'
        url={VOLUNTEER_SIGNUP_URL}
        message={VOLUNTEER_MESSAGE}
      />

      <ShareCard
        title="🟡 דיווח מפגעים – תושבים"
        hint="עוזרים לתושב לדווח על מפגע בשכונה — גם אם הוא לא מתנדב רשום. כך מגדילים את מאגר הנתונים שלנו."
        url={RESIDENT_HAZARD_URL}
        message={HAZARD_MESSAGE}
      />
    </div>
  );
}
