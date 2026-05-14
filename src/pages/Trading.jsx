import { useState } from 'react'
import CoinIcon from '../components/CoinIcon'
import CoinPicker from '../components/CoinPicker'
import TradingViewChart from '../components/TradingViewChart'
import { COINS } from '../data/coins'
import '../components/AppLayout.css'
import './Trading.css'

const AMOUNTS = [10, 50, 100, 250]
const TABS = ['Open positions', 'History', 'Orders']

const POSITIONS = [
  { symbol: 'BTC', time: '00:32', invest: 50, profit: 72, dir: 'up' },
  { symbol: 'LTC', time: '00:32', invest: 50, profit: -72, dir: 'down' },
  { symbol: 'SOL', time: '00:32', invest: 50, profit: 72, dir: 'up' },
  { symbol: 'XRP', time: '00:32', invest: 50, profit: 72, dir: 'up' },
]

const TOP_COINS = [
  { rank: 1, symbol: 'BTC', change: '+12.5%', amount: '+$140.50' },
  { rank: 2, symbol: 'ETH', change: '+8.2%', amount: '+$98.20' },
  { rank: 3, symbol: 'SOL', change: '+5.4%', amount: '+$56.40' },
]

export default function Trading() {
  const [amount, setAmount] = useState(50)
  const [tab, setTab] = useState('Open positions')
  const [activeSymbol, setActiveSymbol] = useState('BTC')

  const activeCoin = COINS.find((c) => c.symbol === activeSymbol) ?? COINS[0]

  return (
    <div className="trading-grid">
      {/* LEFT COLUMN — chart + positions */}
      <div className="trading-main">
        <section className="content-card trading-chart-card">
          <div className="trading-chart-card__header">
            <div className="trading-chart-card__picker">
              <CoinPicker value={activeSymbol} onChange={setActiveSymbol} />
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
              </button>
            ))}
          </div>

          <div className="data-table">
            <div
              className="data-table__head"
              style={{ gridTemplateColumns: '1.5fr 80px 1fr 1fr 100px' }}
            >
              <span>Asset</span>
              <span>Time</span>
              <span>Investment</span>
              <span>Profit</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>

            {POSITIONS.map((p, i) => (
              <div
                key={i}
                className="data-table__row"
                style={{ gridTemplateColumns: '1.5fr 80px 1fr 1fr 100px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CoinIcon symbol={p.symbol} />
                  <span className="cell">
                    <span className="market-row__symbol">{p.symbol}</span>
                    <span className="market-row__pair">/USDT</span>
                  </span>
                </span>
                <span className="cell--muted cell">{p.time}</span>
                <span className="cell">
                  {p.invest} <span className="cell--muted">USDT</span>
                </span>
                <span className={`cell ${p.profit >= 0 ? 'cell--up' : 'cell--down'}`}>
                  {p.profit >= 0 ? `+${p.profit}` : p.profit} USDT
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className={`pill pill--${p.dir}`}>
                    {p.dir} {p.dir === 'up' ? '↑' : '↓'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN — trade panel + balance + tournament + top coins */}
      <div className="trading-side">
        <section className="card trading-trade">
          <h3 className="card__title">Trade</h3>
          <div>
            <div className="trading-trade__row">
              <span className="trading-trade__label">Amount</span>
            </div>
            <div className="trading-trade__amounts">
              {AMOUNTS.map((v) => (
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
          </div>

          <div>
            <div className="trading-trade__row" style={{ justifyContent: 'space-between' }}>
              <span className="trading-trade__label">Timer</span>
              <span style={{ font: '900 18px/1 var(--app-font)', color: 'var(--app-text)' }}>
                00:32
              </span>
            </div>
            <div className="trading-trade__progress">
              <div className="trading-trade__progress-fill" />
            </div>
          </div>

          <div className="trading-trade__row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="trading-trade__label" style={{ marginBottom: 2 }}>
                Payout
              </div>
              <div style={{ font: '700 13px/1 var(--app-font)', color: 'var(--app-text)' }}>
                85%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="trading-trade__label" style={{ marginBottom: 2 }}>
                Amount
              </div>
              <div style={{ font: '700 13px/1 var(--app-font)', color: 'var(--app-text)' }}>
                ${(amount * 1.85).toFixed(2)}
              </div>
            </div>
          </div>

          <button type="button" className="trade-cta trade-cta--up">
            Up
          </button>
          <button type="button" className="trade-cta trade-cta--down">
            Down
          </button>
        </section>

        <section className="card trading-balance-card">
          <h3 className="card__title">Your Balance</h3>
          <div className="trading-balance-amount">
            1,530.45<span>USDT</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="balance-btn">
              Withdraw
            </button>
            <button type="button" className="balance-btn balance-btn--primary">
              Deposit
            </button>
          </div>
        </section>

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
            <button type="button" className="trading-tournament__cta">
              Join Now
            </button>
          </div>
        </section>

        <section className="card">
          <h3 className="card__title">Top Coins</h3>
          {TOP_COINS.map((c) => (
            <button
              key={c.rank}
              type="button"
              className="market-row"
              style={{
                background: 'var(--app-row-bg)',
                border: 0,
                cursor: 'pointer',
                width: '100%',
                color: 'inherit',
              }}
              onClick={() => setActiveSymbol(c.symbol)}
            >
              <span
                className="cell"
                style={{
                  width: 18,
                  fontSize: 10,
                  color: c.rank === 1 ? 'var(--app-accent)' : 'var(--app-text-dim)',
                }}
              >
                #{c.rank}
              </span>
              <CoinIcon symbol={c.symbol} />
              <span className="market-row__name" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ font: '700 12px/1.2 var(--app-font)', color: '#fff' }}>
                  {c.symbol}/USDT
                </span>
                <span style={{ font: '400 9px/1.2 var(--app-font)', color: 'var(--app-text-muted)' }}>
                  24h Performance
                </span>
              </span>
              <span className="cell--up" style={{ font: '700 12px/1 var(--app-font)' }}>
                {c.amount}
              </span>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
