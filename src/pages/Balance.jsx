import { useEffect, useState } from 'react'
import { Pagination } from './_shared'
import { useAuth } from '../context/AuthContext'
import { useTrading } from '../context/TradingContext'
import '../components/AppLayout.css'
import './Balance.css'

const DEMO_TX = [
  { type: 'Deposit',    dir: 'in',  asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'completed', date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
  { type: 'Deposit',    dir: 'in',  asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'completed', date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
  { type: 'Withdraw',   dir: 'out', asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'failed',    date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
  { type: 'Processing', dir: 'out', asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'pending',   date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
  { type: 'Deposit',    dir: 'in',  asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'completed', date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
  { type: 'Deposit',    dir: 'in',  asset: 'USDT', network: 'TRC20', amount: '500.00', status: 'completed', date: 'Oct 24, 2023', hash: '0x4a...2e1c' },
]

const TX_HISTORY_KEY = (uid) => `updownx.tx.${uid ?? 'guest'}`

function readHistory(uid) {
  try {
    const raw = localStorage.getItem(TX_HISTORY_KEY(uid))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeHistory(uid, list) {
  try {
    localStorage.setItem(TX_HISTORY_KEY(uid), JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000]

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13l10-10M13 9V3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 3L3 13M3 7v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* -------------------- Deposit / Withdraw modal -------------------- */
function AmountModal({ mode, balance, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const isDeposit = mode === 'deposit'
  const title = isDeposit ? 'Deposit funds' : 'Withdraw funds'
  const cta = isDeposit ? 'Confirm deposit' : 'Confirm withdrawal'

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    const num = Number(amount)
    if (!Number.isFinite(num) || num <= 0) {
      setError('Enter a positive amount.')
      return
    }
    if (!isDeposit && num > balance) {
      setError('Insufficient balance.')
      return
    }
    setBusy(true)
    try {
      onSubmit(num)
      setBusy(false)
      onClose()
    } catch (err) {
      setBusy(false)
      setError(err?.message || 'Could not complete the transaction.')
    }
  }

  return (
    <div
      className="account-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="account-modal" style={{ maxWidth: 480 }}>
        <button type="button" className="account-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="account-modal__title">{title}</h2>
        <p
          style={{
            margin: '4px 0 18px',
            font: '500 13px/1.4 var(--app-font)',
            color: 'var(--app-text-muted)',
          }}
        >
          {isDeposit
            ? 'Choose how much you want to top up your balance with.'
            : 'Choose how much you want to withdraw from your balance.'}
        </p>

        <form className="amount-modal__form" onSubmit={handleSubmit}>
          <label className="account-field" style={{ marginBottom: 14 }}>
            <span className="account-field__label">Amount (USDT)</span>
            <div className="amount-modal__input-wrap">
              <span className="amount-modal__currency">$</span>
              <input
                type="text"
                inputMode="decimal"
                className="account-input amount-modal__input"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''))
                }
                placeholder="0.00"
                autoFocus
              />
            </div>
          </label>

          <div className="amount-modal__presets">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                className={`amount-btn${Number(amount) === v ? ' is-active' : ''}`}
                onClick={() => setAmount(String(v))}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="amount-modal__summary">
            <div>
              <span>Available balance</span>
              <b>
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </b>
            </div>
            <div>
              <span>{isDeposit ? 'New balance' : 'Remaining balance'}</span>
              <b className="cell--up">
                $
                {(isDeposit
                  ? balance + (Number(amount) || 0)
                  : balance - (Number(amount) || 0)
                ).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </b>
            </div>
          </div>

          {error && (
            <div className="account-form__error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="account-form__save"
            style={{ marginTop: 18, width: '100%', padding: 14 }}
            disabled={busy}
          >
            {busy ? 'Processing…' : cta}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Balance() {
  const { user } = useAuth()
  const { balance, deposit, withdraw } = useTrading()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [history, setHistory] = useState(() => readHistory(user?.id ?? null))

  useEffect(() => {
    setHistory(readHistory(user?.id ?? null))
  }, [user?.id])

  const handleDeposit = (amount) => {
    deposit(amount)
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'Deposit',
      dir: 'in',
      asset: 'USDT',
      network: 'TRC20',
      amount: amount.toFixed(2),
      status: 'completed',
      date: formatDate(Date.now()),
      hash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    }
    const next = [entry, ...history]
    setHistory(next)
    writeHistory(user?.id ?? null, next)
  }

  const handleWithdraw = (amount) => {
    withdraw(amount)
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'Withdraw',
      dir: 'out',
      asset: 'USDT',
      network: 'TRC20',
      amount: amount.toFixed(2),
      status: 'completed',
      date: formatDate(Date.now()),
      hash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    }
    const next = [entry, ...history]
    setHistory(next)
    writeHistory(user?.id ?? null, next)
  }

  const combined = [...history, ...DEMO_TX]
  const PAGE_SIZE = 8
  const visible = combined.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Quick stats derived from balance for plausibility.
  const estimatedBtc = (balance / 64_500).toFixed(4)

  return (
    <div className="balance-page">
      <header className="balance-page__header">
        <div className="balance-page__header-text">
          <h1 className="page-title">Balance</h1>
          <p className="page-subtitle">
            Manage your funds and recent transactions across all networks.
          </p>
        </div>
        <div className="balance-page__actions">
          <button
            type="button"
            className="balance-action-btn balance-action-btn--primary"
            onClick={() => setModal('deposit')}
          >
            <PlusIcon /> Deposit
          </button>
          <button
            type="button"
            className="balance-action-btn"
            onClick={() => setModal('withdraw')}
          >
            <ArrowDownIcon /> Withdraw
          </button>
        </div>
      </header>

      <div className="balance-page__top-grid">
        <section className="content-card balance-total">
          <div className="balance-total__bg-mark" aria-hidden="true" />
          <div className="balance-total__label">Total Balance</div>
          <div className="balance-total__amount">
            {balance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <span>USDT</span>
          </div>
          <div className="balance-total__row">
            <div>
              <div className="balance-total__row-label">Available</div>
              <div className="balance-total__row-value">
                {balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="balance-total__row-label">Locked</div>
              <div className="balance-total__row-value">0.00</div>
            </div>
            <div>
              <div className="balance-total__row-label">24h Change</div>
              <div className="balance-total__row-value cell--up">+5.24%</div>
            </div>
          </div>
        </section>

        <section className="content-card balance-stats">
          <h3 className="card__title">Quick Stats</h3>
          <div className="balance-stats__list">
            <div className="balance-stats__row">
              <span>Estimated BTC</span>
              <b>{estimatedBtc} BTC</b>
            </div>
            <div className="balance-stats__row">
              <span>Staking Yield</span>
              <b className="cell--up">+0.045 ETH</b>
            </div>
            <div className="balance-stats__row">
              <span>Trading PNL</span>
              <b className="cell--up">+$124.00</b>
            </div>
          </div>
          <button type="button" className="balance-stats__analytics">
            View Analytics
          </button>
        </section>
      </div>

      <section className="content-card balance-tx balance-tx--full">
        <header className="balance-tx__header">
          <h3 className="balance-tx__title">Recent Transactions</h3>
          <a className="balance-tx__csv">Download CSV</a>
        </header>

        <div className="balance-tx__list">
          {visible.map((t, i) => (
            <div key={t.id ?? `${i}-${t.hash}`} className="balance-tx__row">
              <span
                className={`balance-tx__type${
                  t.dir === 'out' ? ' balance-tx__type--out' : ''
                }`}
              >
                {t.dir === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />} {t.type}
              </span>
              <span className="balance-tx__asset">
                {t.asset}
                <span>{t.network}</span>
              </span>
              <span className="balance-tx__amount">{t.amount}</span>
              <span>
                <span className={`balance-tx__status balance-tx__status--${t.status}`}>
                  {t.status}
                </span>
              </span>
              <span className="balance-tx__date">{t.date}</span>
              <span className="balance-tx__hash">{t.hash}</span>
            </div>
          ))}
        </div>

        <Pagination
          total={combined.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </section>

      {modal === 'deposit' && (
        <AmountModal
          mode="deposit"
          balance={balance}
          onClose={() => setModal(null)}
          onSubmit={handleDeposit}
        />
      )}
      {modal === 'withdraw' && (
        <AmountModal
          mode="withdraw"
          balance={balance}
          onClose={() => setModal(null)}
          onSubmit={handleWithdraw}
        />
      )}
    </div>
  )
}
