import { useEffect, useMemo, useState } from 'react'
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
  { to: '/tournaments', label: 'Tournaments' },
]

const PRIVATE_NAV = [
  { to: '/balance', label: 'Balance' },
  { to: '/history', label: 'History' },
  { to: '/account', label: 'Settings' },
]

<<<<<<< HEAD
=======
// Live Trades — sample of recent user fills.
const SIDEBAR_TRADES = [
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 1 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 2 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 3 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 4 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 5 },
]

>>>>>>> f2080c6932ae2cf7cf18700224531092c8146a30
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

<<<<<<< HEAD
const MAX_TRADES = 8

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
=======
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
>>>>>>> f2080c6932ae2cf7cf18700224531092c8146a30
}

function LiveTradesCard() {
  const [trades, setTrades] = useState(() =>
    Array.from({ length: MAX_TRADES }, () => generateTrade()),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setTrades((prev) => [generateTrade(), ...prev].slice(0, MAX_TRADES))
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="card">
      <h3 className="card__title">Live Trades</h3>
<<<<<<< HEAD
      <div className="market-list live-trades">
        {trades.map((t) => (
          <div key={t.id} className="market-row live-trade-row">
            <UserAvatar name={t.name} />
            <span className="market-row__name">
              <span className="market-row__symbol">{t.name}</span>
              <span className="market-row__pair">{t.symbol}/USDT</span>
=======
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SIDEBAR_TRADES.map((t, i) => (
          <div key={i} className="market-row">
            <span
              className={`trader-avatar trader-avatar--${t.avatar}`}
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <UserIcon />
            </span>
            <span className="market-row__name">
              <span className="market-row__symbol" style={{ fontSize: 11 }}>{t.userId}</span>
>>>>>>> f2080c6932ae2cf7cf18700224531092c8146a30
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
<<<<<<< HEAD
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
=======
  // No real auth state yet — buttons live on the right side of the
  // header, taking the spot of balance/deposit when the user is
  // logged out.
  const isAuthenticated = true
>>>>>>> f2080c6932ae2cf7cf18700224531092c8146a30
  const { tickers } = useBinancePrices()
  const { balance } = useTrading()
  const [avatarSrc] = useAvatar(user?.id ?? null)

  const navLinks = isAuthenticated ? [...PUBLIC_NAV, ...PRIVATE_NAV] : PUBLIC_NAV

  const handleLogout = () => {
    logout()
    navigate('/trading')
  }

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
<<<<<<< HEAD
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
=======
              <Link to="/account" className="app-header__avatar" aria-label="Account">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
>>>>>>> f2080c6932ae2cf7cf18700224531092c8146a30
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
        <aside className="app-sidebar">
          <MarketsCard tickers={tickers} />
          <LiveTradesCard />
        </aside>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
