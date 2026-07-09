import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './CoordinatorGate.css';

export default function CoordinatorGate() {
  const { unlockCoordinator } = useAuth();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await unlockCoordinator(password);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="coordinator-gate">
      <span className="coordinator-gate__icon" aria-hidden="true">
        🔐
      </span>
      <h1 className="coordinator-gate__title">כניסת רכז</h1>
      <p className="coordinator-gate__hint">הזינו את סיסמת הרכז שלכם</p>

      <form className="coordinator-gate__form" onSubmit={handleSubmit}>
        <input
          type="password"
          className="coordinator-gate__input"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setStatus('idle');
          }}
          autoFocus
          required
        />
        {status === 'error' && <p className="coordinator-gate__error">סיסמה שגויה, נסו שוב.</p>}
        <button type="submit" className="coordinator-gate__submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'בודק…' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
