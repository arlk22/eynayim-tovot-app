import './Card.css';

const ACCENTS = {
  green: { bg: 'var(--color-primary)', fg: 'var(--color-primary-contrast)' },
  peach: { bg: 'var(--color-accent-peach)', fg: 'var(--color-accent-peach-dark)' },
  yellow: { bg: 'var(--color-accent-yellow)', fg: 'var(--color-accent-yellow-dark)' },
  blue: { bg: 'var(--color-accent-blue)', fg: 'var(--color-accent-blue-dark)' },
  lavender: { bg: 'var(--color-accent-lavender)', fg: 'var(--color-accent-lavender-dark)' },
  rose: { bg: 'var(--color-accent-rose)', fg: 'var(--color-accent-rose-dark)' },
  mint: { bg: 'var(--color-accent-mint)', fg: 'var(--color-accent-mint-dark)' },
};

export default function Card({ icon, title, accent = 'green', onClick, disabled = false, badge }) {
  const colors = ACCENTS[accent] || ACCENTS.green;

  return (
    <button
      type="button"
      className={`card${disabled ? ' card--disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ '--card-icon-bg': colors.bg, '--card-icon-fg': colors.fg }}
    >
      <span className="card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="card__title">{title}</span>
      {disabled && <span className="card__badge">בקרוב</span>}
      {!disabled && badge && <span className="card__badge card__badge--active">{badge}</span>}
    </button>
  );
}
