import { Pagination, Pill } from './_shared'
import '../components/AppLayout.css'
import './Tournaments.css'

const LEADERBOARD = [
  { rank: '01', name: 'CryptoKing', profit: '+2,137.00', winRate: '64% WR', last: 'BTC/USDT' },
  { rank: '02', name: 'CryptoKing', profit: '+2,137.00', winRate: '64% WR', last: 'BTC/USDT' },
  { rank: '03', name: 'CryptoKing', profit: '+2,137.00', winRate: 'Hot Streak', last: 'BTC/USDT', hot: true },
]

const ACTIVITY = Array.from({ length: 7 }).map((_, i) => ({
  user: '@CryptoKing',
  pair: 'BTC/USDT LONG',
  amount: i === 1 ? '-$12.20' : '+$56.00',
  dir: i === 1 ? 'down' : 'up',
  when: i === 1 ? '5M AGO' : 'JUST NOW',
}))

const WARRIORS = [
  { title: 'WEEKEND WARRIOR', desc: 'Short-term high volatility scalp battle.', prize: '1,200 USDT' },
  { title: 'WEEKEND WARRIOR', desc: 'Short-term high volatility scalp battle.', prize: '1,200 USDT' },
  { title: 'WEEKEND WARRIOR', desc: 'Short-term high volatility scalp battle.', prize: '1,200 USDT' },
]

export default function Tournaments() {
  return (
    <div className="tournament-layout">
      <section className="content-card tournament-card">
        <header className="tournament-header">
          <h1 className="page-title">Tournaments</h1>
          <div className="tournament-badges">
            <span className="badge badge--success">
              <span className="badge__dot" /> Weekly Challenge
            </span>
            <span className="badge badge--danger">⏱ Ends in: 02d 14h 30m</span>
          </div>
        </header>

        <div className="tournament-banner">
          <div className="tournament-banner__bg" />
          <div className="tournament-banner__content">
            <div className="tournament-banner__title">
              <span className="bull">BULL</span>
              <span className="vs">VS</span>
              <span className="bear">BEAR</span>
            </div>
            <div className="tournament-banner__subtitle">TRADING TOURNAMENT</div>
            <div className="tournament-banner__bottom">
              <div>
                <p className="tournament-banner__tagline">
                  Weekly clash for the ultimate crypto glory.
                </p>
                <div className="tournament-banner__prize">Prize Pool: 5,000 USDT</div>
              </div>
              <button type="button" className="tournament-banner__cta">
                Join Now
              </button>
            </div>
          </div>
        </div>

        <div className="data-table">
          <div
            className="data-table__head"
            style={{ gridTemplateColumns: '60px 1fr 1fr 1fr 1fr' }}
          >
            <span>Rank</span>
            <span>Trader</span>
            <span>Profit (USDT)</span>
            <span>Win-Loss</span>
            <span style={{ textAlign: 'right' }}>Last Trade</span>
          </div>
          {LEADERBOARD.map((row) => (
            <div
              key={row.rank}
              className="data-table__row"
              style={{ gridTemplateColumns: '60px 1fr 1fr 1fr 1fr', height: 44 }}
            >
              <span
                className="cell"
                style={{ color: 'var(--app-accent)', fontStyle: 'italic', font: '900 18px/1 var(--app-font)' }}
              >
                {row.rank}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="trader-avatar trader-avatar--3">C</span>
                <span className="cell">{row.name}</span>
              </span>
              <span className="cell cell--up" style={{ font: '700 14px/1 var(--app-font)' }}>
                {row.profit}
              </span>
              <span>
                {row.hot ? (
                  <span style={{ color: 'var(--app-danger)', font: '900 11px/1 var(--app-font)', textTransform: 'uppercase' }}>
                    {row.winRate}
                  </span>
                ) : (
                  <span className="cell--up" style={{ font: '900 11px/1 var(--app-font)' }}>
                    {row.winRate}
                  </span>
                )}
              </span>
              <span style={{ textAlign: 'right' }}>
                <div className="cell" style={{ font: '700 11px/1 var(--app-font)' }}>
                  {row.last}
                </div>
                <div
                  style={{
                    font: '600 9px/1 var(--app-font)',
                    color: 'var(--app-text-muted)',
                    marginTop: 4,
                  }}
                >
                  JUST NOW
                </div>
              </span>
            </div>
          ))}
        </div>

        <div className="warriors-grid">
          {WARRIORS.map((w, i) => (
            <article key={i} className="warrior-card">
              <div className="warrior-card__bg" />
              <div className="warrior-card__body">
                <h3 className="warrior-card__title">{w.title}</h3>
                <p className="warrior-card__desc">{w.desc}</p>
                <div className="warrior-card__footer">
                  <div>
                    <div className="warrior-card__label">Prize Pool</div>
                    <div className="warrior-card__prize">{w.prize}</div>
                  </div>
                  <button type="button" className="warrior-card__btn">
                    Join
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Pagination total={24} page={1} pageSize={4} />
      </section>

      <aside className="tournament-activity card">
        <h3 className="card__title">Trading Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} className="activity-item">
              <div>
                <div style={{ font: '700 13px/1 var(--app-font)', color: 'var(--app-text)' }}>
                  {a.user}
                </div>
                <div
                  style={{
                    font: '600 10px/1 var(--app-font)',
                    color: 'var(--app-text-muted)',
                    marginTop: 4,
                  }}
                >
                  {a.pair}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={a.dir === 'up' ? 'cell--up' : 'cell--down'} style={{ font: '900 13px/1 var(--app-font)' }}>
                  {a.amount}
                </div>
                <div
                  style={{
                    font: '600 9px/1 var(--app-font)',
                    color: 'var(--app-text-muted)',
                    marginTop: 4,
                  }}
                >
                  {a.when}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
