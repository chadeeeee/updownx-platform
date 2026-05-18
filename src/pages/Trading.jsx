import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CoinIcon from '../components/CoinIcon'
import CoinPicker from '../components/CoinPicker'
import TradingViewChart from '../components/TradingViewChart'
import UserAvatar from '../components/UserAvatar'
import { COINS, TRADE_COINS } from '../data/coins'
import useBinancePrices, {
  formatVolume,
  formatChange,
} from '../hooks/useBinancePrices'
import { randomTraderName } from '../data/liveTraders'
import { useAuth } from '../context/AuthContext'
import { useMarket } from '../context/MarketContext'
import { ClockIcon } from '../components/icons'
import {
  useTrading,
  FEE_RATE,
  MAX_STAKE,
  MIN_STAKE,
  PAYOUT_MULT,
  PAYOUT_PROFIT_PCT,
} from '../context/TradingContext'
import '../components/AppLayout.css'
import './Trading.css'

const STAKE_PRESETS = [10, 50, 250, 500]

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1h', value: '60' },
  { label: '4h', value: '240' },
  { label: '1D', value: 'D' },
]

// Quick-select buttons mirror the broker-style picker (S = seconds, M = minutes, H = hours).
const DURATION_PRESETS = [
  { value: 3, label: 'S3' },
  { value: 15, label: 'S15' },
  { value: 30, label: 'S30' },
  { value: 60, label: 'M1' },
  { value: 180, label: 'M3' },
  { value: 300, label: 'M5' },
  { value: 1800, label: 'M30' },
  { value: 3600, label: 'H1' },
  { value: 14400, label: 'H4' },
]

const DURATION_MIN = 3
const DURATION_MAX = 24 * 3600

const TABS = ['Open positions', 'History', 'Orders']
const MOBILE_TABS = ['Trade', 'Markets', 'Positions', 'Traders']

const MOBILE_POS_COLS = '1.2fr 0.7fr 0.9fr 1fr 80px'

const TOP_TRADERS = [
  { rank: 1, name: 'NovaX', perf: '+$140.50' },
  { rank: 2, name: 'BitLrd', perf: '+$140.50' },
  { rank: 3, name: 'ZenMaster', perf: '+$140.50' },
]

function generateMobileTrade() {
  const coin = TRADE_COINS[Math.floor(Math.random() * TRADE_COINS.length)]
  const isWin = Math.random() > 0.4
  const stake = Math.round((5 + Math.random() * 495) * 100) / 100
  const amount = isWin ? stake * 0.5 : -stake
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: randomTraderName(),
    symbol: coin.symbol,
    amount,
    isWin,
  }
}

function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0')
}

function splitHMS(totalSec) {
  const t = Math.max(0, Math.floor(totalSec))
  return {
    h: Math.floor(t / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
  }
}

function formatHMS(totalSec) {
  const { h, m, s } = splitHMS(totalSec)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

function formatCountdown(ms) {
  return formatHMS(Math.max(0, Math.ceil(ms / 1000)))
}

function formatDurationShort(totalSec) {
  if (totalSec < 60) return `${totalSec}s`
  if (totalSec < 3600) return `${Math.round(totalSec / 60)}m`
  return `${Math.round(totalSec / 3600)}h`
}

/* -------------------- Duration picker -------------------- */
function DurationPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const { h, m, s } = splitHMS(value)

  const clamp = (v) => Math.min(DURATION_MAX, Math.max(DURATION_MIN, v))
  const setHMS = (next) => onChange(clamp(next.h * 3600 + next.m * 60 + next.s))

  const adjust = (unit, delta) => {
    const next = { h, m, s }
    if (unit === 'h') next.h = Math.min(23, Math.max(0, h + delta))
    if (unit === 'm') next.m = Math.min(59, Math.max(0, m + delta))
    if (unit === 's') next.s = Math.min(59, Math.max(0, s + delta))
    setHMS(next)
  }

  return (
    <div className="dp" ref={ref}>
      <button
        type="button"
        className={`dp__field${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="dp__value">{formatHMS(value)}</span>
        <span className="dp__clock" aria-hidden>
          <ClockIcon size={18} />
        </span>
      </button>

      {open && (
        <div className="dp__popover" role="dialog">
          <div className="dp__steppers">
            {['h', 'm', 's'].map((unit) => (
              <div key={`up-${unit}`} className="dp__stepper">
                <button
                  type="button"
                  className="dp__step-btn"
                  onClick={() => adjust(unit, +1)}
                  aria-label={`Increase ${unit}`}
                >
                  +
                </button>
              </div>
            ))}
            <div className="dp__digits">
              <span>{pad2(h)}</span>
              <span className="dp__colon">:</span>
              <span>{pad2(m)}</span>
              <span className="dp__colon">:</span>
              <span>{pad2(s)}</span>
            </div>
            {['h', 'm', 's'].map((unit) => (
              <div key={`down-${unit}`} className="dp__stepper">
                <button
                  type="button"
                  className="dp__step-btn"
                  onClick={() => adjust(unit, -1)}
                  aria-label={`Decrease ${unit}`}
                >
                  −
                </button>
              </div>
            ))}
          </div>

          <div className="dp__presets">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`dp__preset${value === p.value ? ' is-active' : ''}`}
                onClick={() => onChange(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------- Position row -------------------- */
const POSITION_COLS = '1.5fr 100px 110px 1fr 1fr 110px'

function formatPrice(p) {
  if (!Number.isFinite(p)) return '—'
  const decimals = p >= 100 ? 2 : p >= 1 ? 4 : 6
  return p.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function PositionRow({ position, now }) {
  const isOpen = position.status === 'open'
  const remainingMs = position.expiresAt - now

  const profit =
    position.status === 'won'
      ? +(position.amount * PAYOUT_PROFIT_PCT - position.fee).toFixed(2)
      : position.status === 'lost'
        ? -(position.amount + position.fee)
        : 0

  const statusPill =
    position.status === 'cancelled' ? (
      <span className="trade-status trade-status--cancelled">CANCELLED</span>
    ) : (
      <span className={`pill pill--${position.dir}`}>
        {position.dir === 'up' ? 'UP ↑' : 'DOWN ↓'}
      </span>
    )

  return (
    <div
      className="data-table__row"
      style={{ gridTemplateColumns: POSITION_COLS }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CoinIcon symbol={position.symbol} />
        <span className="cell">
          <span className="market-row__symbol">{position.symbol}</span>
          <span className="market-row__pair">/USDT</span>
        </span>
      </span>
      <span className="cell--muted cell">
        {isOpen ? formatCountdown(remainingMs) : formatDurationShort(position.durationSec)}
      </span>
      <span
        className="cell"
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <span style={{ color: 'var(--app-text)', fontWeight: 700 }}>
          {formatPrice(position.entryPrice)}
        </span>
        {!isOpen && Number.isFinite(position.closePrice) && (
          <span className="cell--muted" style={{ fontSize: 11 }}>
            → {formatPrice(position.closePrice)}
          </span>
        )}
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
      <span style={{ textAlign: 'right' }}>{statusPill}</span>
    </div>
  )
}

/* -------------------- Trade panel -------------------- */
function TradePanel({ activeSymbol }) {
  const { balance, openPosition } = useTrading()

  const [amount, setAmount] = useState(10)
  const [duration, setDuration] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (!error && !success) return undefined
    const id = setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 4000)
    return () => clearTimeout(id)
  }, [error, success])

  const fee = +(amount * FEE_RATE).toFixed(4)
  const profitOnWin = +(amount * PAYOUT_PROFIT_PCT - fee).toFixed(2)
  const payoutOnWin = +(amount * PAYOUT_MULT).toFixed(2)

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
      const pos = await openPosition({
        symbol: activeSymbol,
        dir,
        amount,
        durationSec: duration,
      })
      setSuccess(
        `${dir === 'up' ? 'UP' : 'DOWN'} opened @ ${formatPrice(pos.entryPrice)} USDT`,
      )
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
          <span className="trading-trade__label">Time</span>
        </div>
        <DurationPicker value={duration} onChange={setDuration} />
      </div>

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

      <div className="trading-trade__payout">
        <div className="trading-trade__label" style={{ marginBottom: 4 }}>
          Payout
        </div>
        <div className="trading-trade__payout-row">
          <span className="trading-trade__payout-pct">
            +{Math.round(PAYOUT_PROFIT_PCT * 100)}%
          </span>
          <span className="trading-trade__payout-amount">
            +${profitOnWin.toFixed(2)}
          </span>
        </div>
        <div className="trading-trade__payout-sub">
          Win returns ${payoutOnWin.toFixed(2)} (stake + profit)
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
        {busy ? 'Opening…' : 'Buy ↑'}
      </button>
      <button
        type="button"
        className="trade-cta trade-cta--down"
        onClick={() => handleOpen('down')}
        disabled={Boolean(stakeError) || busy}
      >
        {busy ? 'Opening…' : 'Sell ↓'}
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

/* -------------------- Mobile position row (compact) -------------------- */
function MobilePositionRow({ position, now }) {
  const isOpen = position.status === 'open'
  const remainingMs = position.expiresAt - now

  const profit =
    position.status === 'won'
      ? +(position.amount * PAYOUT_PROFIT_PCT - position.fee).toFixed(2)
      : position.status === 'lost'
        ? -(position.amount + position.fee)
        : 0

  const profitStr = isOpen
    ? '—'
    : position.status === 'cancelled'
      ? 'refunded'
      : `${profit >= 0 ? '+' : ''}${profit.toFixed(0)} USDT`

  const statusPill =
    position.status === 'cancelled' ? (
      <span className="trade-status trade-status--cancelled">CANCEL</span>
    ) : (
      <span className={`pill pill--${position.dir}`}>
        {position.dir === 'up' ? 'UP ↑' : 'DOWN ↓'}
      </span>
    )

  return (
    <div className="data-table__row mob-pos-row" style={{ gridTemplateColumns: MOBILE_POS_COLS }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CoinIcon symbol={position.symbol} size={22} />
        <span className="cell">
          <span className="market-row__symbol">{position.symbol}</span>
          <span className="market-row__pair">/USDT</span>
        </span>
      </span>
      <span className="cell--muted cell">
        {isOpen ? formatCountdown(remainingMs) : formatDurationShort(position.durationSec)}
      </span>
      <span className="cell">{position.amount.toFixed(0)} USDT</span>
      <span className={`cell ${position.status === 'won' ? 'cell--up' : position.status === 'lost' ? 'cell--down' : 'cell--muted'}`}>
        {profitStr}
      </span>
      <span style={{ textAlign: 'right' }}>{statusPill}</span>
    </div>
  )
}

/* -------------------- Markets panel (mobile) -------------------- */
function MobileMarketsPanel({ onSelect }) {
  const [query, setQuery] = useState('')
  const { tickers } = useBinancePrices()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COINS
    return COINS.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="mob-markets">
      <label className="mob-markets__search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="mob-markets__list">
        {filtered.map((coin) => {
          const t = tickers[`${coin.symbol}USDT`]
          const change = t ? t.priceChangePercent : null
          const isUp = change != null && change >= 0
          return (
            <div key={coin.symbol} className="mob-markets__row">
              <div className="mob-markets__asset">
                <CoinIcon symbol={coin.symbol} />
                <div className="mob-markets__asset-text">
                  <div className="mob-markets__symbol">
                    {coin.symbol}
                    <span>/USDT</span>
                  </div>
                  <div className="mob-markets__price">
                    {t ? `$${formatPrice(t.lastPrice)}` : '—'}
                  </div>
                </div>
              </div>

              <div className="mob-markets__stats">
                <div
                  className={`mob-markets__change ${
                    change == null ? '' : isUp ? 'is-up' : 'is-down'
                  }`}
                >
                  {formatChange(change)}
                </div>
                <div className="mob-markets__volume-label">VOLUME 24H ( USDT ) :</div>
                <div className="mob-markets__volume">
                  {t ? formatVolume(t.quoteVolume) : '—'}
                </div>
              </div>

              <button
                type="button"
                className="mob-markets__trade-btn"
                onClick={() => onSelect && onSelect(coin.symbol)}
              >
                TRADE
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------- Traders panel (mobile) -------------------- */
function TradersPanel() {
  const [trades, setTrades] = useState(() =>
    Array.from({ length: 5 }, () => generateMobileTrade()),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setTrades((prev) => [generateMobileTrade(), ...prev].slice(0, 5))
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mob-traders">
      <section className="card mob-traders__section">
        <h3 className="card__title">Live Trades</h3>
        <div className="mob-traders__list">
          {trades.map((t) => (
            <div key={t.id} className="mob-traders__row">
              <UserAvatar name={t.name} size={30} />
              <span className="mob-traders__name">{t.name}</span>
              <span className={`mob-traders__amount ${t.isWin ? 'is-up' : 'is-down'}`}>
                {t.isWin ? '+' : ''}{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card mob-traders__section">
        <h3 className="card__title">Top Traders</h3>
        <div className="mob-traders__list">
          {TOP_TRADERS.map((tr) => (
            <div key={tr.rank} className="mob-traders__row mob-traders__row--top">
              <span className="mob-traders__rank">#{tr.rank}</span>
              <UserAvatar name={tr.name} size={36} />
              <span className="mob-traders__meta">
                <span className="mob-traders__top-name">{tr.name}</span>
                <span className="mob-traders__top-sub">24h Performance</span>
              </span>
              <span className="mob-traders__amount is-up">{tr.perf}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function Trading() {
  const { isAuthenticated } = useAuth()
  const { symbol: activeSymbol, setSymbol } = useMarket()
  const { balance, openPositions, closedPositions } = useTrading()
  const [tab, setTab] = useState('Open positions')
  const [mobileTab, setMobileTab] = useState('Trade')
  const [chartInterval, setChartInterval] = useState('5')
  const [now, setNow] = useState(Date.now())

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
      {/* ---- Mobile top tabs ---- */}
      <nav className="mob-tabs">
        {MOBILE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`mob-tabs__btn${mobileTab === t ? ' is-active' : ''}`}
            onClick={() => setMobileTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* ---- Desktop + Mobile: Trade tab ---- */}
      <div className={`trading-main ${mobileTab !== 'Trade' ? 'mob-hide' : ''}`}>
        <section className="content-card trading-chart-card">
          <div className="trading-chart-card__header">
            <div className="trading-chart-card__picker">
              <CoinPicker value={activeSymbol} onChange={setSymbol} />
              <span className="trading-chart-card__change">+70.5%</span>
            </div>
            <div className="trading-chart-card__intervals">
              {INTERVALS.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  className={`interval-btn${chartInterval === it.value ? ' is-active' : ''}`}
                  onClick={() => setChartInterval(it.value)}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
          <TradingViewChart symbol={activeCoin.tv} interval={chartInterval} height={520} />
        </section>

        {/* Desktop positions (hidden on mobile) */}
        <section className="content-card trading-positions desk-only">
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
              style={{ gridTemplateColumns: POSITION_COLS }}
            >
              <span>Asset</span>
              <span>{tab === 'Open positions' ? 'Time left' : 'Duration'}</span>
              <span>Entry price</span>
              <span>Investment</span>
              <span>Profit</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>

            {visiblePositions.length === 0 ? (
              <div className="data-table__empty">
                {tab === 'Open positions'
                  ? isAuthenticated
                    ? 'No open positions yet — pick a time and amount on the right.'
                    : 'Sign in to open positions.'
                  : tab === 'Orders'
                    ? 'No pending orders.'
                    : 'No closed trades yet.'}
              </div>
            ) : tab === 'Orders' ? (
              <div className="data-table__empty">No pending orders.</div>
            ) : (
              visiblePositions.map((p) => (
                <PositionRow key={p.id} position={p} now={now} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* ---- Desktop sidebar (hidden on mobile) ---- */}
      <div className="trading-side desk-only">
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

      {/* ---- Mobile: Trade panel (below chart) ---- */}
      <div className={`mob-trade-panel ${mobileTab !== 'Trade' ? 'mob-hide' : ''}`}>
        {isAuthenticated ? (
          <TradePanel activeSymbol={activeSymbol} />
        ) : (
          <TradeAuthCta />
        )}
      </div>

      {/* ---- Mobile: Positions tab ---- */}
      <div className={`mob-positions ${mobileTab !== 'Positions' ? 'mob-hide' : ''}`}>
        <section className="content-card trading-positions">
          <div className="tabs">
            {['Open positions', 'History', 'Orders'].map((t) => (
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
            <div className="data-table__head" style={{ gridTemplateColumns: MOBILE_POS_COLS }}>
              <span>Asset</span>
              <span>Time</span>
              <span>Investment</span>
              <span>Profit</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>

            {visiblePositions.length === 0 ? (
              <div className="data-table__empty">
                {tab === 'Open positions'
                  ? isAuthenticated
                    ? 'No open positions yet.'
                    : 'Sign in to open positions.'
                  : 'No closed trades yet.'}
              </div>
            ) : (
              visiblePositions.map((p) => (
                <MobilePositionRow key={p.id} position={p} now={now} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* ---- Mobile: Markets tab ---- */}
      <div className={`mob-markets-wrap ${mobileTab !== 'Markets' ? 'mob-hide' : ''}`}>
        <MobileMarketsPanel
          onSelect={(sym) => {
            setSymbol(sym)
            setMobileTab('Trade')
          }}
        />
      </div>

      {/* ---- Mobile: Traders tab ---- */}
      <div className={`mob-traders-wrap ${mobileTab !== 'Traders' ? 'mob-hide' : ''}`}>
        <TradersPanel />
      </div>
    </div>
  )
}
