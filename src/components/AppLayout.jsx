import { NavLink, Link, Outlet } from 'react-router-dom'
import CoinIcon from './CoinIcon'
import useBinancePrices, { formatChange } from '../hooks/useBinancePrices'
import { SIDEBAR_COINS, TRADE_COINS } from '../data/coins'
import logoImg from '../assets/logo.svg'
import './AppLayout.css'

const NAV_LINKS = [
  { to: '/trading', label: 'Trading' },
  { to: '/markets', label: 'Markets' },
  { to: '/balance', label: 'Balance' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/history', label: 'History' },
  { to: '/account', label: 'Settings' },
]

// Live Trades — sample of recent user fills.
const SIDEBAR_TRADES = [
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 1 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 2 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 3 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 4 },
  { userId: 'id_user334...', amount: '+$140.50', dir: 'up', avatar: 5 },
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
  return (
    <section className="card">
      <h3 className="card__title">Markets</h3>
      <label className="search">
        <SearchIcon />
        <input type="search" placeholder="Search..." />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SIDEBAR_COINS.map((coin) => {
          const t = tickers[`${coin.symbol}USDT`]
          const change = t ? t.priceChangePercent : null
          const isUp = change != null && change >= 0
          return (
            <div key={coin.symbol} className="market-row">
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
            </div>
          )
        })}
      </div>
    </section>
  )
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
}

function LiveTradesCard() {
  return (
    <section className="card">
      <h3 className="card__title">Live Trades</h3>
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
            </span>
            <span className={`market-row__change ${t.dir === 'up' ? 'is-up' : 'is-down'}`}>
              {t.amount}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AppLayout() {
  // No real auth state yet — buttons live on the right side of the
  // header, taking the spot of balance/deposit when the user is
  // logged out.
  const isAuthenticated = true
  const { tickers } = useBinancePrices()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <Link to="/trading" className="app-header__logo" aria-label="UpdownX home">
            <img src={logoImg} alt="UpdownX" />
          </Link>
        </div>

        <nav className="app-header__nav">
          {NAV_LINKS.map((link) => (
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
                  1,530.45<span>USDT</span>
                </span>
              </div>
              <Link to="/balance" className="app-header__deposit">
                Deposit
              </Link>
              <Link to="/account" className="app-header__avatar" aria-label="Account">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </Link>
              <button type="button" className="app-header__logout" aria-label="Log out">
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
