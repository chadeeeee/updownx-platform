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
  { to: '/account', label: 'Account' },
]

// Live Trades — sample of recent fills for various coins.
const SIDEBAR_TRADES = TRADE_COINS.slice(0, 6).map((coin, i) => ({
  symbol: coin.symbol,
  amount: i === 2 ? '-$48.20' : '+$140.50',
  dir: i === 2 ? 'down' : 'up',
}))

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

function LiveTradesCard() {
  return (
    <section className="card">
      <h3 className="card__title">Live Trades</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SIDEBAR_TRADES.map((t, i) => (
          <div key={i} className="market-row">
            <CoinIcon symbol={t.symbol} />
            <span className="market-row__name">
              <span className="market-row__symbol">{t.symbol}</span>
              <span className="market-row__pair">/USDT</span>
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
  const isAuthenticated = false
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
                U
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
