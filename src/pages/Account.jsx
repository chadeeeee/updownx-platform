import '../components/AppLayout.css'

export default function Account() {
  return (
    <section className="content-card" style={{ gap: 28 }}>
      <h1 className="page-title">Account</h1>
      <p className="page-subtitle">
        Manage your profile, security and platform preferences.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '20px 0',
          borderBottom: '1px solid var(--app-border-soft)',
        }}
      >
        <span
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00ffa3 0%, #6366f1 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '900 32px/1 var(--app-font)',
            color: '#0b0f14',
            border: '2px solid rgba(0,255,163,0.4)',
          }}
        >
          U
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ font: '900 22px/1 var(--app-font)', color: 'var(--app-text)' }}>
            User #398064
          </div>
          <div style={{ font: '600 13px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
            user@updownx.com
          </div>
          <div className="cell--up" style={{ font: '700 12px/1 var(--app-font)', marginTop: 6 }}>
            Verified · Pro tier
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {[
          { label: 'Profile', desc: 'Name, surname, region, language' },
          { label: 'Security', desc: 'Password, 2FA, login history' },
          { label: 'API Keys', desc: 'Create and manage API access' },
          { label: 'Notifications', desc: 'Email, push, sound alerts' },
          { label: 'Verification (KYC)', desc: 'Identity & address proof' },
          { label: 'Sessions & devices', desc: 'Active sessions and signouts' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            style={{
              background: 'var(--app-row-bg)',
              border: '1px solid var(--app-border-soft)',
              borderRadius: 12,
              padding: 20,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--app-text)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--app-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--app-border-soft)')}
          >
            <span style={{ font: '900 16px/1.2 var(--app-font)' }}>{item.label}</span>
            <span style={{ font: '400 13px/1.4 var(--app-font)', color: 'var(--app-text-muted)' }}>
              {item.desc}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
