import './Pagination.css';

function pageWindow(page, totalPages) {
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="דפדוף בין עמודים">
      <button
        type="button"
        className="pagination__nav"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ‹ הקודם
      </button>

      <div className="pagination__numbers">
        {pageWindow(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="pagination__ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination__number${p === page ? ' pagination__number--active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="pagination__nav"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        הבא ›
      </button>
    </nav>
  );
}
