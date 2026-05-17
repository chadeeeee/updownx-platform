import { Pagination } from './_shared'
import { TRADER_HANDLES, avatarColors, avatarInitials } from '../data/traders'
import '../components/AppLayout.css'
import './Tournaments.css'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'DOGE/USDT']

const LEADERBOARD = [
  { rank: '01', name: 'SatoshiX',    profit: '+12,840.50', winRate: '78% WR',    last: 'BTC/USDT', when: 'Just now' },
  { rank: '02', name: 'NeoLambo',    profit: '+9,612.10',  winRate: '71% WR',    last: 'ETH/USDT', when: '2m ago' },
  { rank: '03', name: 'BlockMage',   profit: '+7,304.80',  winRate: 'Hot streak', last: 'SOL/USDT', when: '4m ago', hot: true },
  { rank: '04', name: 'AlphaWolf',   profit: '+5,917.30',  winRate: '66% WR',    last: 'XRP/USDT', when: '6m ago' },
  { rank: '05', name: 'PixelPump',   profit: '+4,820.90',  winRate: '64% WR',    last: 'BTC/USDT', when: '11m ago' },
]

const ACTIVITY = [
  { user: '@SatoshiX',    pair: 'BTC/USDT UP',   amount: '+$192.00', dir: 'up',   when: 'Just now' },
  { user: '@RektQueen',   pair: 'ETH/USDT DOWN', amount: '-$48.00',  dir: 'down', when: '1m ago' },
  { user: '@HodlHero',    pair: 'SOL/USDT UP',   amount: '+$84.00',  dir: 'up',   when: '3m ago' },
  { user: '@NeoLambo',    pair: 'BTC/USDT UP',   amount: '+$460.00', dir: 'up',   when: '4m ago' },
  { user: '@OnChainOwl',  pair: 'XRP/USDT UP',   amount: '+$23.00',  dir: 'up',   when: '5m ago' },
  { user: '@PixelPump',   pair: 'DOGE/USDT DOWN', amount: '-$17.50', dir: 'down', when: '7m ago' },
  { user: '@CipherKai',   pair: 'LTC/USDT UP',   amount: '+$118.00', dir: 'up',   when: '9m ago' },
]

const WARRIORS = [
  { title: 'Weekend Warrior',   desc: 'Short-term high volatility scalp battle.',  prize: '1,200 USDT' },
  { title: 'Altcoin Arena',     desc: 'Trade only alts — top mover takes the pot.', prize: '2,400 USDT' },
  { title: 'Volatility Vault',  desc: 'Reward grows the further price swings.',    prize: '3,800 USDT' },
]

function TraderCell({ name }) {
  const [a, b] = avatarColors(name)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        className="trader-avatar"
        style={{
          background: `linear-gradient(135deg, ${a}, ${b})`,
          color: '#0b0f14',
        }}
      >
        {avatarInitials(name)}
      </span>
      <span className="cell">{name}</span>
    </span>
  )
}

function ActivityAvatar({ handle }) {
  const [a, b] = avatarColors(handle)
  return (
    <span
      className="activity-item__avatar"
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {avatarInitials(handle)}
    </span>
  )
}

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
          <div className="tournament-banner__scrim" />

          <div className="tournament-banner__top">
            <span className="tournament-banner__chip">
              <span className="tournament-banner__chip-dot" /> Live · Weekly
            </span>
            <span className="tournament-banner__participants">1,284 traders competing</span>
          </div>

          <div className="tournament-banner__bottom">
            <div className="tournament-banner__info">
              <div className="tournament-banner__eyebrow">Trading Tournament</div>
              <h2 className="tournament-banner__heading">Bull vs Bear</h2>
              <p className="tournament-banner__tagline">
                Weekly clash for the ultimate crypto glory.
              </p>
              <div className="tournament-banner__prize">
                <span className="tournament-banner__prize-label">Prize Pool</span>
                <span className="tournament-banner__prize-amount">
                  5,000 <span>USDT</span>
                </span>
              </div>
            </div>
            <button type="button" className="tournament-banner__cta">
              Join Now
            </button>
          </div>
        </div>

        <div className="data-table">
          <div
            className="data-table__head"
            style={{ gridTemplateColumns: '60px 1.4fr 1fr 1fr 1fr' }}
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
              style={{ gridTemplateColumns: '60px 1.4fr 1fr 1fr 1fr', height: 52 }}
            >
              <span
                className="cell"
                style={{
                  color: 'var(--app-accent)',
                  fontStyle: 'italic',
                  font: '900 18px/1 var(--app-font)',
                }}
              >
                {row.rank}
              </span>
              <TraderCell name={row.name} />
              <span className="cell cell--up" style={{ font: '700 14px/1 var(--app-font)' }}>
                {row.profit}
              </span>
              <span>
                {row.hot ? (
                  <span
                    style={{
                      color: 'var(--app-danger)',
                      font: '900 11px/1 var(--app-font)',
                      textTransform: 'uppercase',
                    }}
                  >
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
                  {row.when}
                </div>
              </span>
            </div>
          ))}
        </div>

        <div className="warriors-grid">
          {WARRIORS.map((w, i) => (
            <article key={w.title} className={`warrior-card warrior-card--${i + 1}`}>
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
            <div key={`${a.user}-${i}`} className="activity-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <ActivityAvatar handle={a.user} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      font: '700 13px/1 var(--app-font)',
                      color: 'var(--app-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
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
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  className={a.dir === 'up' ? 'cell--up' : 'cell--down'}
                  style={{ font: '900 13px/1 var(--app-font)' }}
                >
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

// PAIRS export retained for any importer that wants a stable list.
export { PAIRS }
