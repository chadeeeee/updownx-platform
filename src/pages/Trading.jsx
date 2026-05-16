import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CoinIcon from '../components/CoinIcon'
import CoinPicker from '../components/CoinPicker'
import TradingViewChart from '../components/TradingViewChart'
import { COINS } from '../data/coins'
import { useAuth } from '../context/AuthContext'
import { useMarket } from '../context/MarketContext'
import useTrading, {
  FEE_RATE,
  MAX_STAKE,
  MIN_STAKE,
  PAYOUT_MULT,
} from '../hooks/useTrading'
import '../components/AppLayout.css'
import './Trading.css'

const STAKE_PRESETS = [10, 50, 100, 250, 500]
const DURATIONS = [
  { value: 60, label: '1m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
]
const TABS = ['Open positions', 'History']

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function PositionRow({ position, now }) {
  const isOpen = position.status === 'open'
  const remainingMs = position.expiresAt - now
  const elapsedRatio = isOpen
    ? Math.min(
        1,
        Math.max(0, 1 - remainingMs / (position.durationSec * 1000)),
      )
    : 1

  const payout =
    position.status === 'won' ? position.amount * (PAYOUT_MULT - 1) : 0
  const profit =
    position.status === 'won'
      ? +(position.amount * (PAYOUT_MULT - 1) - position.fee).toFixed(2)
      : position.status === 'lost'
        ? -(position.amount + position.fee)
        : 0

  return (
    <div
      className="data-table__row"
      style={{ gridTemplateColumns: '1.5fr 90px 90px 1fr 1fr 110px' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CoinIcon symbol={position.symbol} />
        <span className="cell">
          <span className="market-row__symbol">{position.symbol}</span>
          <span className="market-row__pair">/USDT</span>
        </span>
      </span>
      <span className={`cell pill pill--${position.dir}`}>
        {position.dir === 'up' ? 'UP ↑' : 'DOWN ↓'}
      </span>
      <span className="cell--muted cell">
        {isOpen ? formatCountdown(remainingMs) : `${position.durationSec / 60}m`}
      </span>
      <span className="cell">
        {position.amount.toFixed(2)} <span className="cell--muted">USDT</span>
      </span>
      <span
        className={`cell ${
          position.status === 'won'
            ? 'cell--up'
            : position.status === 'lost'
              ? 'cell--down'
              : 'cell--muted'
        }`}
      >
        {isOpen
          ? '—'
          : position.status === 'cancelled'
            ? 'refunded'
            : `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} USDT`}
      </span>
      <span style={{ textAlign: 'right' }}>
        {isOpen ? (
          <span className="trading-progress" aria-label="Time remaining">
            <span
              className="trading-progress__fill"
              style={{ width: `${elapsedRatio * 100}%` }}
            />
          </span>
        ) : (
          <span
            className={`trade-status trade-status--${position.status}`}
            aria-label={position.status}
          >
            {position.status === 'won'
              ? 'WON'
              : position.status === 'lost'
                ? 'LOST'
                : 'CANCELLED'}
          </span>
        )}
      </span>
    </div>
  )
}

function TradePanel({ activeSymbol }) {
  const { balance, openPosition } = useTrading()

  const [amount, setAmount] = useState(50)
  const [duration, setDuration] = useState(60)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Auto-clear inline messages so the panel stays clean.
  useEffect(() => {
    if (!error && !success) return undefined
    const id = setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 4000)
    return () => clearTimeout(id)
  }, [error, success])

  const fee = +(amount * FEE_RATE).toFixed(4)
  const projectedReturn = +(amount * PAYOUT_MULT).toFixed(2)
  const profitOnWin = +(projectedReturn - amount - fee).toFixed(2)

  const stakeError =
    amount < MIN_STAKE
      ? `Min $${MIN_STAKE}`
      : amount > MAX_STAKE
        ? `Max $${MAX_STAKE}`
        : amount + fee > balance
          ? 'Not enough balance'
          : null

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    if (value === '') return setAmount(0)
    setAmount(Number(value))
  }

  const handleOpen = async (dir) => {
    if (busy || stakeError) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      await openPosition({
        symbol: activeSymbol,
        dir,
        amount,
        durationSec: duration,
      })
      setSuccess(`${dir === 'up' ? 'UP' : 'DOWN'} position opened.`)
    } catch (err) {
      setError(err?.message || 'Could not open position.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card trading-trade">
      <h3 className="card__title">Trade</h3>

      <div>
        <div className="trading-trade__row">
          <span className="trading-trade__label">Amount (USDT)</span>
        </div>
        <div className="trading-trade__amounts">
          {STAKE_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              className={`amount-btn${amount === v ? ' is-active' : ''}`}
              onClick={() => setAmount(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="decimal"
          className="trading-trade__input"
          value={amount}
          onChange={handleAmountChange}
          aria-label="Stake amount"
        />
      </div>

      <div>
        <div className="trading-trade__row">
          <span className="trading-trade__label">Duration</span>
        </div>
        <div className="trading-trade__amounts">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`amount-btn${duration === d.value ? ' is-active' : ''}`}
              onClick={() => setDuration(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trading-trade__row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="trading-trade__label" style={{ marginBottom: 2 }}>
            Payout
          </div>
          <div style={{ font: '700 13px/1 var(--app-font)', color: 'var(--app-text)' }}>
            +50%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="trading-trade__label" style={{ marginBottom: 2 }}>
            Fee
          </div>
          <div style={{ font: '600 12px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
            ${fee.toFixed(4)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="trading-trade__label" style={{ marginBottom: 2 }}>
            Win Profit
          </div>
          <div style={{ font: '700 13px/1 var(--app-font)', color: 'var(--app-accent)' }}>
            +${profitOnWin.toFixed(2)}
          </div>
        </div>
      </div>

      {stakeError && <div className="trading-trade__inline-error">{stakeError}</div>}
      {error && <div className="trading-trade__inline-error">{error}</div>}
      {success && <div className="trading-trade__inline-success">{success}</div>}

      <button
        type="button"
        className="trade-cta trade-cta--up"
        onClick={() => handleOpen('up')}
        disabled={Boolean(stakeError) || busy}
      >
        {busy ? 'Opening…' : 'Up'}
      </button>
      <button
        type="button"
        className="trade-cta trade-cta--down"
        onClick={() => handleOpen('down')}
        disabled={Boolean(stakeError) || busy}
      >
        {busy ? 'Opening…' : 'Down'}
      </button>
    </section>
  )
}

function TradeAuthCta() {
  return (
    <section className="card trading-trade trading-cta-card">
      <h3 className="card__title">Start Trading</h3>
      <p className="trading-cta-card__text">
        Sign up to open positions, claim a starting balance and join tournaments.
      </p>
      <Link to="/register" className="trade-cta trade-cta--up">
        Create account
      </Link>
      <Link to="/login" className="balance-btn" style={{ width: '100%' }}>
        I already have an account
      </Link>
    </section>
  )
}

function BalanceCard({ balance }) {
  return (
    <section className="card trading-balance-card">
      <h3 className="card__title">Your Balance</h3>
      <div className="trading-balance-amount">
        {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span>USDT</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to="/balance" className="balance-btn">
          Withdraw
        </Link>
        <Link to="/balance" className="balance-btn balance-btn--primary">
          Deposit
        </Link>
      </div>
    </section>
  )
}

export default function Trading() {
  const { isAuthenticated } = useAuth()
  const { symbol: activeSymbol, setSymbol } = useMarket()
  const { balance, openPositions, closedPositions } = useTrading()

  const [tab, setTab] = useState('Open positions')
  const [now, setNow] = useState(Date.now())

  // Drives the live countdown rendered in PositionRow.
  useEffect(() => {
    if (openPositions.length === 0) return undefined
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [openPositions.length])

  const activeCoin = useMemo(
    () => COINS.find((c) => c.symbol === activeSymbol) ?? COINS[0],
    [activeSymbol],
  )

  const visiblePositions =
    tab === 'Open positions' ? openPositions : closedPositions

  return (
    <div className="trading-grid">
      {/* LEFT COLUMN — chart + positions */}
      <div className="trading-main">
        <section className="content-card trading-chart-card">
          <div className="trading-chart-card__header">
            <div className="trading-chart-card__picker">
              <CoinPicker value={activeSymbol} onChange={setSymbol} />
            </div>
          </div>
          <TradingViewChart symbol={activeCoin.tv} interval="5" height={520} />
        </section>

        <section className="content-card trading-positions">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab${tab === t ? ' is-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
                {t === 'Open positions' && openPositions.length > 0 && (
                  <span className="tab__badge">{openPositions.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="data-table">
            <div
              className="data-table__head"
              style={{ gridTemplateColumns: '1.5fr 90px 90px 1fr 1fr 110px' }}
            >
              <span>Asset</span>
              <span>Direction</span>
              <span>{tab === 'Open positions' ? 'Time left' : 'Duration'}</span>
              <span>Investment</span>
              <span>Profit</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>

            {visiblePositions.length === 0 ? (
              <div className="data-table__empty">
                {tab === 'Open positions'
                  ? isAuthenticated
                    ? 'No open positions yet — pick an amount and a direction on the right.'
                    : 'Sign in to open positions.'
                  : 'No closed trades yet.'}
              </div>
            ) : (
              visiblePositions.map((p) => (
                <PositionRow key={p.id} position={p} now={now} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN — trade panel + balance + tournament */}
      <div className="trading-side">
        {isAuthenticated ? (
          <>
            <TradePanel activeSymbol={activeSymbol} />
            <BalanceCard balance={balance} />
          </>
        ) : (
          <TradeAuthCta />
        )}

        <section className="card trading-tournament">
          <div className="trading-tournament__header">
            <div>
              <div className="trading-tournament__title">Bull vs Bear</div>
              <div className="trading-tournament__subtitle">Current Tournament</div>
            </div>
            <span className="trading-tournament__live">Live</span>
          </div>
          <div className="trading-tournament__bottom">
            <div>
              <div className="trading-tournament__prize-label">Prize Pool</div>
              <div className="trading-tournament__prize-amount">
                5,000<span>USDT</span>
              </div>
            </div>
            <Link to="/tournaments" className="trading-tournament__cta">
              Join Now
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
