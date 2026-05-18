import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { PAYOUT_PROFIT_PCT, useTrading } from '../context/TradingContext'
import useAvatar from '../hooks/useAvatar'
import { CameraIcon, LockIcon, TrashIcon, UserIcon } from '../components/icons'
import '../components/AppLayout.css'

const PROFILE_KEY = (uid) => `updownx.profile.${uid ?? 'guest'}`
const SECURITY_KEY = (uid) => `updownx.security.${uid ?? 'guest'}`

const REGIONS = ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania']
const LANGUAGES = ['English', 'Українська', 'Español', 'Deutsch', 'Français', '中文']
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function Field({ label, children }) {
  return (
    <label className="account-field">
      <span className="account-field__label">{label}</span>
      {children}
    </label>
  )
}

function ProfileForm({ userId, email, userName, userSurname, onSavedName }) {
  const defaults = {
    name: '',
    surname: '',
    region: REGIONS[0],
    language: LANGUAGES[0],
  }
  const [form, setForm] = useState(() => readJson(PROFILE_KEY(userId), defaults))
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    setForm(readJson(PROFILE_KEY(userId), defaults))
    setSavedAt(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = (e) => {
    e.preventDefault()
    writeJson(PROFILE_KEY(userId), form)
    setSavedAt(Date.now())
    onSavedName?.(form)
  }

  return (
    <form className="account-form" onSubmit={handleSave}>
      <div className="account-form__grid">
        <Field label="Name">
          <input
            type="text"
            className="account-input"
            value={form.name}
            onChange={update('name')}
            placeholder={userName || 'Name'}
          />
        </Field>
        <Field label="Surname">
          <input
            type="text"
            className="account-input"
            value={form.surname}
            onChange={update('surname')}
            placeholder={userSurname || 'Surname'}
          />
        </Field>
        <Field label="Email">
          <input type="email" className="account-input" value={email ?? ''} disabled />
        </Field>
        <Field label="Region">
          <select className="account-input" value={form.region} onChange={update('region')}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select
            className="account-input"
            value={form.language}
            onChange={update('language')}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="account-form__actions">
        {savedAt && <span className="account-form__saved">Saved ✓</span>}
        <button type="submit" className="account-form__save">
          Save changes
        </button>
      </div>
    </form>
  )
}

function SecurityForm({ userId }) {
  const defaults = { twoFA: false }
  const [prefs, setPrefs] = useState(() => readJson(SECURITY_KEY(userId), defaults))
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    setPrefs(readJson(SECURITY_KEY(userId), defaults))
    setPw({ current: '', next: '', confirm: '' })
    setMsg(null)
    setSavedAt(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const toggle = (k) => () => {
    const updated = { ...prefs, [k]: !prefs[k] }
    setPrefs(updated)
    writeJson(SECURITY_KEY(userId), updated)
    setSavedAt(Date.now())
  }

  const handlePassword = (e) => {
    e.preventDefault()
    setMsg(null)
    if (pw.next.length < 8) {
      setMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (pw.next !== pw.confirm) {
      setMsg({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setPw({ current: '', next: '', confirm: '' })
    setMsg({ type: 'ok', text: 'Password updated.' })
  }

  return (
    <div className="account-form">
      <form onSubmit={handlePassword}>
        <div className="account-form__grid">
          <Field label="Current password">
            <input
              type="password"
              className="account-input"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              className="account-input"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              className="account-input"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        </div>
        {msg && (
          <div
            className={
              msg.type === 'ok' ? 'account-form__saved' : 'account-form__error'
            }
          >
            {msg.text}
          </div>
        )}
        <div className="account-form__actions">
          <button type="submit" className="account-form__save">
            Update password
          </button>
        </div>
      </form>

      <div className="account-toggle-list">
        <div className="account-toggle-row">
          <div>
            <div className="account-toggle-row__title">Two-factor auth (2FA)</div>
            <div className="account-toggle-row__desc">
              Require a one-time code when signing in from a new device.
            </div>
          </div>
          <button
            type="button"
            className={`account-toggle${prefs.twoFA ? ' is-on' : ''}`}
            onClick={toggle('twoFA')}
            aria-pressed={prefs.twoFA}
          >
            <span className="account-toggle__knob" />
          </button>
        </div>
        {savedAt && <div className="account-form__saved">Preferences saved ✓</div>}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="account-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="account-modal">
        <button
          type="button"
          className="account-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="account-modal__title">{title}</h2>
        <div className="account-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
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

  // Smooth Catmull-Rom-ish curve via control points (Bezier approximation).
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
            <linearGradient id="profile-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 255, 163, 0.35)" />
              <stop offset="100%" stopColor="rgba(0, 255, 163, 0)" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#profile-area)" />
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

/* -------------------- Page -------------------- */
const SECTIONS = [
  {
    key: 'profile',
    label: 'Profile',
    desc: 'Name, surname, region, language',
    Icon: UserIcon,
  },
  {
    key: 'security',
    label: 'Security',
    desc: 'Password, 2FA',
    Icon: LockIcon,
  },
]

function formatJoinedDate(iso) {
  if (!iso) return 'Joined recently'
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return 'Joined recently'
  return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

export default function Account() {
  const { user } = useAuth()
  const { closedPositions } = useTrading()
  const [openSection, setOpenSection] = useState(null)
  const [savedProfile, setSavedProfile] = useState(() =>
    readJson(PROFILE_KEY(user?.id ?? null), { name: '', surname: '' }),
  )
  const [avatarSrc, setAvatarSrc] = useAvatar(user?.id ?? null)
  const [avatarError, setAvatarError] = useState(null)
  const [shareToast, setShareToast] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setSavedProfile(readJson(PROFILE_KEY(user?.id ?? null), { name: '', surname: '' }))
  }, [user?.id])

  const userId = user?.id ?? null
  const email = user?.email ?? 'user@updownx.com'
  const displayId = user?.public_id ?? '000000000000'

  const displayName =
    [savedProfile.name || user?.name, savedProfile.surname || user?.surname]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Trader'

  const initial = displayName[0]?.toUpperCase() ?? 'T'

  const stats = useMemo(() => {
    const wins = closedPositions.filter((p) => p.status === 'won')
    const losses = closedPositions.filter((p) => p.status === 'lost')
    const settled = wins.length + losses.length
    const winRate = settled === 0 ? 0 : (wins.length / settled) * 100
    const totalProfit =
      wins.reduce((acc, p) => acc + p.amount * PAYOUT_PROFIT_PCT, 0) -
      losses.reduce((acc, p) => acc + p.amount, 0)
    return {
      winRate,
      totalProfit,
      tradeCount: closedPositions.length,
    }
  }, [closedPositions])

  // Weekly performance series: bucket closed trades by weekday for the last 7
  // days, starting from MON, falling back to a gentle demo curve when empty.
  const weekly = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    let hasData = false
    closedPositions.forEach((p) => {
      if (!p.closedAt) return
      const d = new Date(p.closedAt)
      const weekday = (d.getDay() + 6) % 7
      const delta =
        p.status === 'won' ? p.amount * PAYOUT_PROFIT_PCT : -p.amount
      buckets[weekday] += delta
      hasData = true
    })
    if (!hasData) {
      return [180, 720, 380, 540, 240, 980, 410]
    }
    let running = 0
    return buckets.map((b) => {
      running += b
      return running
    })
  }, [closedPositions])

  const handlePickAvatar = () => fileInputRef.current?.click()

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setAvatarError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be under 1.5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarSrc(String(reader.result))
    reader.onerror = () => setAvatarError('Could not read that file.')
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarError(null)
    setAvatarSrc(null)
  }

  const handleShare = async () => {
    try {
      const link = `${window.location.origin}/u/${displayId}`
      await navigator.clipboard?.writeText(link)
    } catch {
      /* ignore — older browsers */
    }
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2400)
  }

  const sectionRenderers = {
    profile: () => (
      <ProfileForm
        userId={userId}
        email={email}
        userName={user?.name}
        userSurname={user?.surname}
        onSavedName={(p) => setSavedProfile(p)}
      />
    ),
    security: () => <SecurityForm userId={userId} />,
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <button
          type="button"
          className="profile-hero__avatar"
          onClick={handlePickAvatar}
          aria-label="Change avatar"
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
          {!avatarSrc && initial}
          <span className="profile-hero__avatar-badge" aria-hidden>
            <CameraIcon size={14} />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFile}
          style={{ display: 'none' }}
        />

        <div className="profile-hero__meta">
          <div className="profile-hero__name-row">
            <h1 className="profile-hero__name">{displayName}</h1>
            <span className="profile-hero__elite">Elite</span>
          </div>
          <div className="profile-hero__sub">
            <span className="profile-hero__sub-dot" />
            Pro Trader · {formatJoinedDate(user?.created_at)}
          </div>
          <div className="profile-hero__id">ID: {displayId}</div>
          {avatarError && (
            <div className="account-form__error" style={{ marginTop: 10 }}>
              {avatarError}
            </div>
          )}
          {avatarSrc && (
            <button
              type="button"
              className="profile-hero__avatar-remove"
              onClick={handleRemoveAvatar}
            >
              <TrashIcon size={12} />
              Remove photo
            </button>
          )}
        </div>

        <div className="profile-hero__actions">
          <button
            type="button"
            className="profile-hero__share"
            onClick={handleShare}
          >
            {shareToast ? 'Link copied ✓' : 'Share Profile'}
          </button>
          <button
            type="button"
            className="profile-hero__edit"
            onClick={() => setOpenSection('profile')}
          >
            Edit Profile
          </button>
        </div>
      </section>

      <div className="profile-stat-grid">
        <StatCard
          label="Win rate"
          value={`${stats.winRate.toFixed(1)}%`}
          footer={`${stats.tradeCount > 0 ? '+2.4% vs last week' : 'Start trading to track'}`}
        />
        <StatCard
          label="Total profit"
          value={`${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          footer="+12% Monthly"
        />
        <StatCard
          label="Trade count"
          value={stats.tradeCount.toLocaleString('en-US')}
          footer="Avg 12 trades/day"
          footerTone="muted"
        />
        <StatCard
          label="Followers"
          value={(4_821).toLocaleString('en-US')}
          footer="★ Top 1% Creator"
        />
      </div>

      <ProfitGrowthCard
        total={Math.max(0, 42_100.55 + stats.totalProfit)}
        roiPct={15.4 + (stats.tradeCount > 0 ? stats.winRate / 50 : 0)}
        weekly={weekly}
      />

      <section className="content-card account-page" style={{ gap: 18 }}>
        <h2 className="card__title">Account settings</h2>
        <div className="account-sections">
          {SECTIONS.map((s, i) => {
            const Icon = s.Icon
            return (
              <button
                key={s.key}
                type="button"
                className="account-section-card"
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => setOpenSection(s.key)}
              >
                <span className="account-section-card__icon" aria-hidden>
                  <Icon size={22} />
                </span>
                <span className="account-section-card__text">
                  <span className="account-section-card__title">{s.label}</span>
                  <span className="account-section-card__desc">{s.desc}</span>
                </span>
                <span className="account-section-card__arrow" aria-hidden>
                  →
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {openSection &&
        (() => {
          const section = SECTIONS.find((s) => s.key === openSection)
          if (!section) return null
          return (
            <Modal title={section.label} onClose={() => setOpenSection(null)}>
              {sectionRenderers[section.key]()}
            </Modal>
          )
        })()}
    </div>
  )
}
