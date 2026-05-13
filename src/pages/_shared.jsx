import '../components/AppLayout.css'

export function Pagination({
  total = 24,
  page = 1,
  pageSize = 4,
  totalPages,
  onPage,
}) {
  const computedTotalPages = totalPages ?? Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build a small page window: current ± 1, capped to total.
  const visible = []
  const start = Math.max(1, Math.min(page - 1, computedTotalPages - 2))
  for (let i = 0; i < Math.min(3, computedTotalPages); i += 1) {
    visible.push(start + i)
  }

  const handle = (n) => () => onPage && onPage(n)

  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing {from} to {to} of {total}
      </span>
      <div className="pagination__pages">
        <button
          type="button"
          className="pagination__btn"
          disabled={page <= 1}
          onClick={handle(page - 1)}
          aria-label="Previous"
        >
          ‹
        </button>
        {visible.map((n) => (
          <button
            key={n}
            type="button"
            className={`pagination__btn${n === page ? ' is-current' : ''}`}
            onClick={handle(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="pagination__btn"
          disabled={page >= computedTotalPages}
          onClick={handle(page + 1)}
          aria-label="Next"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export function TradeButton({ children = 'Trade' }) {
  return (
    <button
      type="button"
      style={{
        background: 'var(--app-accent)',
        color: '#0b0f14',
        border: 0,
        borderRadius: 9999,
        padding: '6px 18px',
        font: '900 11px/1 var(--app-font)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function Pill({ kind = 'win', children }) {
  return <span className={`pill pill--${kind}`}>{children || kind}</span>
}
