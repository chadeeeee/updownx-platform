import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import '../components/AppLayout.css'

/* -------------------- Helpers -------------------- */
function formatJoinedDate(iso) {
  if (!iso) return 'Joined recently'
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return 'Joined recently'
  return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

/* -------------------- Stats card -------------------- */
function StatCard({ label, value, footer, footerTone = 'up' }) {
  return (
    <div className="profile-stat-card">
      <div className="profile-stat-card__label">{label}</div>
      <div className="profile-stat-card__value">{value}</div>
      {footer && (
        <div className={`profile-stat-card__footer profile-stat-card__footer--${footerTone}`}>
          {footer}
        </div>
      )}
    </div>
  )
}

/* -------------------- Profit Growth chart -------------------- */
function buildAreaPath(values, width, height, padX = 16, padY = 14) {
  if (values.length === 0) return { line: '', area: '' }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = (width - padX * 2) / Math.max(1, values.length - 1)

  const points = values.map((v, i) => {
    const x = padX + i * stepX
    const y = padY + (height - padY * 2) * (1 - (v - min) / range)
    return [x, y]
  })

  let line = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[Math.max(0, i - 1)]
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)]
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    line += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  const lastX = points[points.length - 1][0]
  const firstX = points[0][0]
  const area = `${line} L ${lastX.toFixed(2)} ${height - padY} L ${firstX.toFixed(2)} ${height - padY} Z`

  return { line, area }
}

function ProfitGrowthCard({ total, roiPct, weekly }) {
  const VIEW_W = 1000
  const VIEW_H = 260
  const { line, area } = useMemo(
    () => buildAreaPath(weekly, VIEW_W, VIEW_H),
    [weekly],
  )

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  return (
    <section className="profile-chart-card">
      <div className="profile-chart-card__header">
        <h3 className="profile-chart-card__title">Profit Growth</h3>
        <span className="profile-chart-card__subtitle">Live performance tracking</span>
      </div>

      <div className="profile-chart-card__amount">
        ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="profile-chart-card__roi">
        <span className="profile-chart-card__roi-pill">
          {roiPct >= 0 ? '+' : ''}
          {roiPct.toFixed(1)}%
        </span>
        <span className="profile-chart-card__roi-label">ROI this month</span>
      </div>

      <div className="profile-chart-card__chart">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="260"
          aria-hidden
        >
          <defs>
            <linearGradient id="pub-profile-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 255, 163, 0.35)" />
              <stop offset="100%" stopColor="rgba(0, 255, 163, 0)" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pub-profile-area)" />
          <path d={line} stroke="var(--app-accent)" strokeWidth="2.5" fill="none" />
        </svg>
        <div className="profile-chart-card__axis">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------- Public Profile Page -------------------- */
export default function PublicProfile() {
  const { publicId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/users/${publicId}`)
      .then((r) => {
        if (!r.ok) throw new Error('User not found')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setProfile(data.user)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [publicId])

  // Demo weekly data (public profile has no access to the viewed user's trades)
  const weekly = [180, 720, 380, 540, 240, 980, 410]

  if (loading) {
    return (
      <div className="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="public-profile-loader" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="public-profile-error-card">
          <h2>User not found</h2>
          <p>This profile doesn't exist or has been removed.</p>
          <Link to="/trading" className="public-profile-error-card__link">
            Go to Trading
          </Link>
        </div>
      </div>
    )
  }

  const displayName =
    [profile.name, profile.surname].filter(Boolean).join(' ').trim() || 'Trader'
  const initial = displayName[0]?.toUpperCase() ?? 'T'

  return (
    <div className="profile-page">
      {/* Hero — same as Account but no buttons */}
      <section className="profile-hero profile-hero--public">
        <div className="profile-hero__avatar profile-hero__avatar--static">
          {initial}
        </div>

        <div className="profile-hero__meta">
          <div className="profile-hero__name-row">
            <h1 className="profile-hero__name">{displayName}</h1>
            <span className="profile-hero__elite">Elite</span>
          </div>
          <div className="profile-hero__sub">
            <span className="profile-hero__sub-dot" />
            Pro Trader · {formatJoinedDate(profile.created_at)}
          </div>
          <div className="profile-hero__id">ID: {profile.public_id}</div>
        </div>
      </section>

      {/* Stats */}
      <div className="profile-stat-grid">
        <StatCard label="Win rate" value="78.4%" footer="+2.4% vs last week" />
        <StatCard
          label="Total profit"
          value="+$42,100.55"
          footer="+12% Monthly"
        />
        <StatCard
          label="Trade count"
          value="1,284"
          footer="Avg 12 trades/day"
          footerTone="muted"
        />
        <StatCard
          label="Followers"
          value="4,821"
          footer="Top 1% Creator"
        />
      </div>

      {/* Chart */}
      <ProfitGrowthCard total={42100.55} roiPct={15.4} weekly={weekly} />
    </div>
  )
}
