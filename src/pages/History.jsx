import { useState } from 'react'
import { Pagination, Pill } from './_shared'
import CoinIcon from '../components/CoinIcon'
import '../components/AppLayout.css'

const TABS = ['All', 'Trading', 'Deposits', 'Withdrawals']

const ROWS = [
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'loss', profit: -72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
  { result: 'win', profit: 72, time: 'Oct 24, 14:23:12' },
]

export default function History() {
  const [activeTab, setActiveTab] = useState('All')

  const COLS = '1.5fr 80px 80px 100px 100px 130px'

  return (
    <section className="content-card">
      <h1 className="page-title">History</h1>
      <p className="page-subtitle">
        Review your trading activity and financial logs across all assets.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab${activeTab === t ? ' is-active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="data-table">
        <div className="data-table__head" style={{ gridTemplateColumns: COLS }}>
          <span>Symbol</span>
          <span>Result</span>
          <span>Payout</span>
          <span>Wager</span>
          <span>Profit</span>
          <span>Time</span>
        </div>

        {ROWS.map((row, i) => (
          <div key={i} className="data-table__row" style={{ gridTemplateColumns: COLS }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CoinIcon symbol="BTC" />
              <span className="cell">
                <span className="market-row__symbol">BTC</span>
                <span className="market-row__pair">/USDT</span>
              </span>
            </span>
            <span>
              <Pill kind={row.result}>{row.result}</Pill>
            </span>
            <span className="cell">182 %</span>
            <span className="cell">
              72 <span className="cell--muted">USDT</span>
            </span>
            <span className={`cell ${row.profit >= 0 ? 'cell--up' : 'cell--down'}`}>
              {row.profit >= 0 ? `+${row.profit}` : row.profit} USDT
            </span>
            <span className="cell" style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>
              {row.time}
            </span>
          </div>
        ))}
      </div>

      <Pagination total={24} page={1} pageSize={4} />
    </section>
  )
}
