import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import UserAvatar from './UserAvatar'
import useBinancePrices, { formatChange } from '../hooks/useBinancePrices'
import { SIDEBAR_COINS, TRADE_COINS } from '../data/coins'
import { randomTraderName } from '../data/liveTraders'
import { useAuth } from '../context/AuthContext'
import { useMarket } from '../context/MarketContext'
import { useTrading } from '../context/TradingContext'
import useAvatar from '../hooks/useAvatar'
import logoImg from '../assets/logo.svg'
import './AppLayout.css'

const PUBLIC_NAV = [
  { to: '/trading', label: 'Trading' },
  { to: '/markets', label: 'Markets' },
]

const PRIVATE_NAV = [
  { to: '/balance', label: 'Balance' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/history', label: 'History' },
  { to: '/account', label: 'Settings' },
]

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MarketsCard({ tickers }) {
  const { symbol: activeSymbol, setSymbol } = useMarket()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return SIDEBAR_COINS
    return SIDEBAR_COINS.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    )
  }, [search])

  const handlePick = (coin) => {
    setSymbol(coin.symbol)
    navigate('/trading')
  }

  return (
    <section className="card">
      <h3 className="card__title">Markets</h3>
      <label className="search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="market-list">
        {items.map((coin) => {
          const t = tickers[`${coin.symbol}USDT`]
          const change = t ? t.priceChangePercent : null
          const isUp = change != null && change >= 0
          const isActive = coin.symbol === activeSymbol
          return (
            <button
              key={coin.symbol}
              type="button"
              className={`market-row market-row--button${isActive ? ' is-active' : ''}`}
              onClick={() => handlePick(coin)}
            >
              <CoinIcon symbol={coin.symbol} />
              <span className="market-row__name">
                <span className="market-row__symbol">{coin.symbol}</span>
                <span className="market-row__pair">/USDT</span>
              </span>
              <span
                className={`market-row__change ${
                  change == null ? '' : isUp ? 'is-up' : 'is-down'
                }`}
              >
                {formatChange(change)}
              </span>
            </button>
          )
        })}
        {items.length === 0 && (
          <div className="market-list__empty">No matches.</div>
        )}
      </div>
    </section>
  )
}

const MAX_TRADES = 50

function generateTrade() {
  const coin = TRADE_COINS[Math.floor(Math.random() * TRADE_COINS.length)]
  const isWin = Math.random() > 0.4
  const dir = Math.random() > 0.5 ? 'up' : 'down'
  // Stake between $5–$500 to keep amounts realistic in the sidebar feed.
  const stake = Math.round((5 + Math.random() * 495) * 100) / 100
  const amount = isWin ? stake * 0.5 : -stake
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: randomTraderName(),
    symbol: coin.symbol,
    dir,
    amount,
    isWin,
  }
}

function LiveTradesCard() {
  const [trades, setTrades] = useState(() =>
    Array.from({ length: MAX_TRADES }, () => generateTrade()),
  )
  const [visibleCount, setVisibleCount] = useState(MAX_TRADES)
  const listRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      setTrades((prev) => [generateTrade(), ...prev].slice(0, MAX_TRADES))
    }, 2200)
    return () => clearInterval(id)
  }, [])

  // Compute how many rows fully fit so we never show a clipped half-row.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined

    const recompute = () => {
      const row = list.querySelector('.live-trade-row')
      if (!row) return
      const rowH = row.getBoundingClientRect().height
      if (!rowH) return
      const styles = getComputedStyle(list)
      const gap = parseFloat(styles.rowGap || styles.gap || '0') || 0
      const avail = list.clientHeight
      const n = Math.max(1, Math.floor((avail + gap) / (rowH + gap)))
      setVisibleCount(n)
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(list)
    return () => ro.disconnect()
  }, [])

  const visibleTrades = trades.slice(0, visibleCount)

  return (
    <section className="card">
      <h3 className="card__title">Live Trades</h3>
      <div className="market-list live-trades" ref={listRef}>
        {visibleTrades.map((t) => (
          <div key={t.id} className="market-row live-trade-row">
            <UserAvatar name={t.name} />
            <span className="market-row__name">
              <span className="market-row__symbol">{t.name}</span>
              <span className="market-row__pair">{t.symbol}/USDT</span>
            </span>
            <span className={`market-row__change ${t.isWin ? 'is-up' : 'is-down'}`}>
              {t.isWin ? '+' : ''}
              {t.amount.toFixed(2)}$
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AppLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const { tickers } = useBinancePrices()
  const { balance } = useTrading()
  const [avatarSrc] = useAvatar(user?.id ?? null)

  const navLinks = isAuthenticated ? [...PUBLIC_NAV, ...PRIVATE_NAV] : PUBLIC_NAV

  const handleLogout = () => {
    logout()
    navigate('/trading')
  }

  // Bind the sidebar height to the main content column so Live Trades always
  // ends at the same baseline as the last content card on the right.
  const sidebarRef = useRef(null)
  const contentRef = useRef(null)

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    const content = contentRef.current
    if (!sidebar || !content) return undefined

    const sync = () => {
      sidebar.style.height = `${Math.max(220, content.offsetHeight)}px`
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(content)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <Link to="/trading" className="app-header__logo" aria-label="UpdownX home">
            <img src={logoImg} alt="UpdownX" />
          </Link>
        </div>

        <nav className="app-header__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `app-header__nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__right">
          {isAuthenticated ? (
            <>
              <div className="app-header__balance-info">
                <span>Balance</span>
                <span className="app-header__balance-amount">
                  {balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span>USDT</span>
                </span>
              </div>
              <Link to="/balance" className="app-header__deposit">
                Deposit
              </Link>
              <Link
                to="/account"
                className="app-header__avatar"
                aria-label="Account"
                title={user?.email || 'Account'}
                style={
                  avatarSrc
                    ? {
                        backgroundImage: `url(${avatarSrc})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: 'transparent',
                      }
                    : undefined
                }
              >
                {avatarSrc ? '' : user?.name ? user.name[0].toUpperCase() : 'U'}
              </Link>
              <button
                type="button"
                className="app-header__logout"
                aria-label="Log out"
                onClick={handleLogout}
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <div className="app-header__auth">
              <Link to="/login" className="app-header__auth-btn">
                Login
              </Link>
              <Link
                to="/register"
                className="app-header__auth-btn app-header__auth-btn--primary"
              >
                Registration
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar" ref={sidebarRef}>
          <MarketsCard tickers={tickers} />
          <LiveTradesCard />
        </aside>

        <main className="app-content" ref={contentRef}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="mob-bottom-nav">
        <NavLink to="/trading" className={({ isActive }) => `mob-bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 13h4v8H3zM10 7h4v14h-4zM17 3h4v18h-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Trading</span>
        </NavLink>
        <NavLink to="/balance" className={({ isActive }) => `mob-bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg>
          <span>Balance</span>
        </NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => `mob-bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 9V3h12v6a6 6 0 11-12 0zM18 5h2a2 2 0 012 2v1a3 3 0 01-3 3h-1M6 5H4a2 2 0 00-2 2v1a3 3 0 003 3h1M9 21h6M12 15v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Tournaments</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `mob-bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <span>History</span>
        </NavLink>
        <NavLink to="/account" className={({ isActive }) => `mob-bottom-nav__item${isActive ? ' is-active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <span>Account</span>
        </NavLink>
      </nav>
    </div>
  )
}
