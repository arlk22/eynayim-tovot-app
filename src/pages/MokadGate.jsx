import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './MokadGate.css';

export default function MokadGate() {
  const { unlockMokad } = useAuth();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await unlockMokad(password);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="mokad-gate">
      <span className="mokad-gate__icon" aria-hidden="true">
        🎧
      </span>
      <h1 className="mokad-gate__title">כניסת מוקד</h1>
      <p className="mokad-gate__hint">הזינו את סיסמת המוקד שלכם</p>

      <form className="mokad-gate__form" onSubmit={handleSubmit}>
        <input
          type="password"
          className="mokad-gate__input"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setStatus('idle');
          }}
          autoFocus
          required
        />
        {status === 'error' && <p className="mokad-gate__error">סיסמה שגויה, נסו שוב.</p>}
        <button type="submit" className="mokad-gate__submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'בודק…' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
