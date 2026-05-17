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
  // Down-left arrow: funds coming IN
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 3L3 13M3 7v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowOutIcon() {
  // Up-right arrow: funds going OUT
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13l10-10M13 9V3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProcessingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4M12 2v3h-3M4 14v-3h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v9m-4-4 4 4 4-4M3 13h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2 1.5 13.5h13L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.5v3.2M8 11.5v.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

const DEPOSIT_ADDRESS = 'TQ3h9f7v2kL9sP1xZ4mN8rW7uV1bX'

function shortenAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 8)}...${addr.slice(-7)}`
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
  const PAGE_SIZE = 4
  const visible = combined.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const [network, setNetwork] = useState('Tron (TRC20)')
  const [copied, setCopied] = useState(false)
  const [mobileTab, setMobileTab] = useState('balance')

  const MOBILE_TABS = [
    { id: 'balance', label: 'Balance' },
    { id: 'deposit', label: 'Deposit' },
    { id: 'markets', label: 'Markets' },
    { id: 'traders', label: 'Traders' },
  ]

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(DEPOSIT_ADDRESS)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  // Quick stats derived from balance for plausibility.
  const estimatedBtc = (balance / 64_500).toFixed(4)

  return (
    <div className={`balance-page balance-page--tab-${mobileTab}`}>
      <nav className="balance-mobile-tabs" role="tablist">
        {MOBILE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mobileTab === t.id}
            className={`balance-mobile-tab${mobileTab === t.id ? ' is-active' : ''}`}
            onClick={() => setMobileTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

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
        <section className="content-card balance-total balance-mobile-pane balance-mobile-pane--balance">
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

          <div className="balance-total__mobile-actions">
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
        </section>

        <section className="content-card balance-stats balance-mobile-pane balance-mobile-pane--balance">
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

      <div className="balance-page__bottom-grid">
        <section className="content-card balance-deposit balance-mobile-pane balance-mobile-pane--deposit">
          <h3 className="balance-deposit__title">
            <DownloadIcon /> Deposit USDT
          </h3>

          <div>
            <div className="balance-deposit__network-label">Network Selector</div>
            <div className="balance-deposit__network">
              <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option>Tron (TRC20)</option>
                <option>Ethereum (ERC20)</option>
                <option>BNB Smart Chain (BEP20)</option>
                <option>Polygon</option>
              </select>
            </div>
          </div>

          <div className="balance-deposit__qr">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(DEPOSIT_ADDRESS)}`}
              alt="Deposit address QR code"
            />
          </div>

          <div className="balance-deposit__address">
            <code>{shortenAddress(DEPOSIT_ADDRESS)}</code>
            <button
              type="button"
              className="balance-deposit__copy"
              onClick={handleCopy}
              aria-label="Copy address"
            >
              <CopyIcon />
            </button>
          </div>

          <div className="balance-deposit__warning">
            <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8 }}>
              <WarningIcon />
              <span>
                {copied ? (
                  <strong>Address copied to clipboard.</strong>
                ) : (
                  <>
                    Send only <strong>USDT</strong> via <strong>TRC20</strong> to this
                    address. Sending any other coin or using another network may result
                    in permanent loss.
                  </>
                )}
              </span>
            </span>
          </div>
        </section>

        <section className="content-card balance-tx balance-mobile-pane balance-mobile-pane--balance">
          <header className="balance-tx__header">
            <h3 className="balance-tx__title">Recent Transactions</h3>
            <a className="balance-tx__csv">Download CSV</a>
          </header>

          <div className="balance-tx__list">
            {visible.map((t, i) => {
              const Icon =
                t.type === 'Processing'
                  ? ProcessingIcon
                  : t.dir === 'in'
                    ? ArrowInIcon
                    : ArrowOutIcon
              return (
                <div key={t.id ?? `${i}-${t.hash}`} className="balance-tx__row">
                  <span
                    className={`balance-tx__type balance-tx__type--${
                      t.type === 'Processing'
                        ? 'processing'
                        : t.dir === 'in'
                          ? 'in'
                          : 'out'
                    }`}
                  >
                    <Icon /> {t.type}
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
              )
            })}
          </div>

          <Pagination
            total={combined.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </section>
      </div>

      <section className="content-card balance-empty-pane balance-mobile-pane balance-mobile-pane--markets">
        <p>Markets — coming soon.</p>
      </section>
      <section className="content-card balance-empty-pane balance-mobile-pane balance-mobile-pane--traders">
        <p>Traders — coming soon.</p>
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
