import { useState } from 'react';
import './SharePage.css';

const HAZARD_REPORT_URL = 'https://gdform1.fillout.com/gdform1';
const SHARE_MESSAGE = `שלום! אפשר לדווח על מפגע בשכונה בקלות דרך הקישור הזה: ${HAZARD_REPORT_URL}`;

export default function SharePage() {
  const [copied, setCopied] = useState(false);

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;
    window.open(url, '_blank', 'noopener');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(HAZARD_REPORT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the link is still shown on screen to copy manually
    }
  }

  return (
    <div className="share-page">
      <span className="share-page__icon" aria-hidden="true">
        🏠
      </span>
      <h1 className="share-page__title">שתפו תושב</h1>
      <p className="share-page__hint">
        עוזרים לתושב לדווח על מפגע בשכונה — גם אם הוא לא מתנדב רשום. שתפו את הקישור לטופס דיווח המפגע.
      </p>

      <button type="button" className="share-page__whatsapp" onClick={shareWhatsApp}>
        📱 שיתוף ב-WhatsApp
      </button>

      <button type="button" className="share-page__copy" onClick={copyLink}>
        {copied ? '✓ הקישור הועתק' : '🔗 העתקת קישור'}
      </button>

      <p className="share-page__link">{HAZARD_REPORT_URL}</p>
    </div>
  );
}
