import { useLayoutEffect, useRef, useState } from 'react'
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

const WARRIORS = [
  { title: 'Weekend Warrior',   desc: 'Short-term high volatility scalp battle.',  prize: '1,200 USDT' },
  { title: 'Altcoin Arena',     desc: 'Trade only alts — top mover takes the pot.', prize: '2,400 USDT' },
  { title: 'Volatility Vault',  desc: 'Reward grows the further price swings.',    prize: '3,800 USDT' },
]

// Trading activity feed — handles cycled from the shared trader pool so avatars
// stay consistent with the leaderboard. We render plenty of rows; CSS clips
// any that don't fit so the column always reaches the bottom of the layout.
const ACTIVITY = Array.from({ length: 24 }, (_, i) => {
  const isLoss = i % 5 === 1
  const minutesAgo = i * 2
  return {
    user: `@${TRADER_HANDLES[i % TRADER_HANDLES.length]}`,
    pair: 'BTC/USDT LONG',
    amount: isLoss ? '-$12.20' : '+$56.00',
    dir: isLoss ? 'down' : 'up',
    when: minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`,
  }
})

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

export default function Tournaments() {
  const mainRef = useRef(null)
  const activityRef = useRef(null)
  const activityListRef = useRef(null)
  const [visibleActivity, setVisibleActivity] = useState(ACTIVITY.length)

  // Match the activity column height to the main (banner + leaderboard) column
  // so it ends exactly at the bottom of the third leaderboard row, and render
  // only the rows that fully fit (no clipped half-row at the bottom).
  useLayoutEffect(() => {
    const main = mainRef.current
    const activity = activityRef.current
    const list = activityListRef.current
    if (!main || !activity || !list) return undefined

    const sync = () => {
      activity.style.height = `${main.offsetHeight}px`
      const row = list.querySelector('.tournament-activity__row')
      if (!row) return
      const rowH = row.getBoundingClientRect().height
      if (!rowH) return
      const styles = getComputedStyle(list)
      const gap = parseFloat(styles.rowGap || styles.gap || '0') || 0
      const avail = list.clientHeight
      const n = Math.max(1, Math.floor((avail + gap) / (rowH + gap)))
      setVisibleActivity(Math.min(ACTIVITY.length, n))
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(main)
    ro.observe(list)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div className="tournament-layout">
      {/* Mobile-only top tab nav for the Tournaments page. */}
      <nav className="mob-top-nav">
        <span className="mob-top-nav__btn is-active">Home</span>
        <span className="mob-top-nav__btn">Markets</span>
        <span className="mob-top-nav__btn">Traders</span>
      </nav>

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

        <div className="tournament-inner">
          <div className="tournament-main" ref={mainRef}>

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

        <div className="data-table tournament-leaderboard">
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
          {LEADERBOARD.slice(0, 3).map((row) => (
            <div
              key={row.rank}
              className="data-table__row tournament-leaderboard__row"
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

          </div>

          <aside className="tournament-activity" ref={activityRef}>
            <h3 className="tournament-activity__title">Trading Activity</h3>
            <div className="tournament-activity__list" ref={activityListRef}>
              {ACTIVITY.slice(0, visibleActivity).map((a, i) => (
                <div key={`${a.user}-${i}`} className="tournament-activity__row">
                  <div className="tournament-activity__info">
                    <div className="tournament-activity__user">{a.user}</div>
                    <div className="tournament-activity__pair">{a.pair}</div>
                  </div>
                  <div className="tournament-activity__meta">
                    <div className={`tournament-activity__amount ${a.dir === 'up' ? 'is-up' : 'is-down'}`}>
                      {a.amount}
                    </div>
                    <div className="tournament-activity__when">{a.when.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
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
    </div>
  )
}

// PAIRS export retained for any importer that wants a stable list.
export { PAIRS }
