import { Pagination } from './_shared'
import '../components/AppLayout.css'

const TX = [
  { type: 'Deposit', amount: '+500.00 USDT', status: 'Completed', time: 'Oct 24, 14:23:12', dir: 'in' },
  { type: 'Withdrawal', amount: '-120.00 USDT', status: 'Completed', time: 'Oct 23, 09:14:08', dir: 'out' },
  { type: 'Deposit', amount: '+1,000.00 USDT', status: 'Completed', time: 'Oct 21, 18:42:31', dir: 'in' },
  { type: 'Withdrawal', amount: '-250.00 USDT', status: 'Pending', time: 'Oct 20, 22:08:55', dir: 'out' },
  { type: 'Deposit', amount: '+200.00 USDT', status: 'Completed', time: 'Oct 19, 11:33:02', dir: 'in' },
  { type: 'Deposit', amount: '+150.00 USDT', status: 'Completed', time: 'Oct 18, 16:51:47', dir: 'in' },
]

export default function Balance() {
  return (
    <>
      <section className="content-card" style={{ gap: 28 }}>
        <h1 className="page-title">Balance</h1>
        <p className="page-subtitle">
          Manage your funds — deposit, withdraw and review your wallet activity.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 8,
          }}
        >
          <div
            style={{
              background: 'var(--app-row-bg)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(0,255,163,0.15)',
            }}
          >
            <div
              style={{
                font: '700 11px/1 var(--app-font)',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--app-text-muted)',
                marginBottom: 12,
              }}
            >
              Total Balance
            </div>
            <div
              style={{
                font: '900 32px/1 var(--app-font)',
                color: 'var(--app-text)',
                marginBottom: 4,
              }}
            >
              1,530.45{' '}
              <span style={{ font: '600 14px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
                USDT
              </span>
            </div>
            <div className="cell--up" style={{ font: '700 13px/1 var(--app-font)' }}>
              +12.4% this week
            </div>
          </div>

          <div
            style={{
              background: 'var(--app-row-bg)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(0,255,163,0.15)',
            }}
          >
            <div
              style={{
                font: '700 11px/1 var(--app-font)',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--app-text-muted)',
                marginBottom: 12,
              }}
            >
              Available
            </div>
            <div
              style={{
                font: '900 32px/1 var(--app-font)',
                color: 'var(--app-text)',
                marginBottom: 16,
              }}
            >
              1,280.45{' '}
              <span style={{ font: '600 14px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
                USDT
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{
                  background: 'var(--app-accent)',
                  color: '#0b0f14',
                  border: 0,
                  borderRadius: 8,
                  padding: '10px 18px',
                  font: '900 12px/1 var(--app-font)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Deposit
              </button>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  color: 'var(--app-text)',
                  border: '1px solid var(--app-border-soft)',
                  borderRadius: 8,
                  padding: '10px 18px',
                  font: '900 12px/1 var(--app-font)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Withdraw
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--app-row-bg)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(0,255,163,0.15)',
            }}
          >
            <div
              style={{
                font: '700 11px/1 var(--app-font)',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--app-text-muted)',
                marginBottom: 12,
              }}
            >
              In trades
            </div>
            <div
              style={{
                font: '900 32px/1 var(--app-font)',
                color: 'var(--app-text)',
                marginBottom: 4,
              }}
            >
              250.00{' '}
              <span style={{ font: '600 14px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
                USDT
              </span>
            </div>
            <div style={{ font: '600 13px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
              5 open positions
            </div>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h2 className="page-title" style={{ fontSize: 24, lineHeight: '28px' }}>
          Transactions
        </h2>

        <div className="data-table">
          <div
            className="data-table__head"
            style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}
          >
            <span>Type</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Time</span>
          </div>

          {TX.map((t, i) => (
            <div
              key={i}
              className="data-table__row"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}
            >
              <span className="cell">{t.type}</span>
              <span className={`cell ${t.dir === 'in' ? 'cell--up' : 'cell--down'}`}>
                {t.amount}
              </span>
              <span className="cell" style={{ color: t.status === 'Pending' ? '#fbbf24' : 'var(--app-accent)' }}>
                {t.status}
              </span>
              <span className="cell" style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>
                {t.time}
              </span>
            </div>
          ))}
        </div>

        <Pagination total={24} page={1} pageSize={6} />
      </section>
    </>
  )
}
