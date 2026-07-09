import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorCode, setErrorCode] = useState(null);

  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorCode(null);
    try {
      await login(phone);
      navigate(from, { replace: true });
    } catch (err) {
      setStatus('error');
      setErrorCode(err.code || 'unknown');
    }
  }

  const errorMessage = {
    phone_not_found: 'המספר הזה לא מוכר במערכת. אם אתם מתנדבים רשומים, בדקו את המספר או פנו לרכז.',
    already_claimed: 'המספר הזה כבר רשום במכשיר אחר. לאיפוס יש לפנות לרכז.',
    missing_phone: 'יש להזין מספר טלפון.',
    unknown: 'משהו השתבש. נסו שוב.',
  }[errorCode];

  return (
    <div className="login-page">
      <div className="login-page__badge" aria-hidden="true">
        👁️
      </div>
      <h1 className="login-page__title">קהילת הדר – עיניים טובות</h1>
      <p className="login-page__subtitle">התחברות מתנדבים</p>

      <form className="login-page__form" onSubmit={handleSubmit}>
        <label className="login-page__label" htmlFor="phone">
          מספר טלפון
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="050-1234567"
          className="login-page__input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        {status === 'error' && <p className="login-page__error">{errorMessage}</p>}

        <button type="submit" className="login-page__submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'מתחבר…' : 'כניסה'}
        </button>
      </form>

      <p className="login-page__hint">
        ההתחברות פעם אחת בלבד — המכשיר הזה יזכור אתכם בפעם הבאה.
      </p>
    </div>
  );
}
