import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import laptop from '../assets/auth/laptop.png'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import './auth.css'

const RESEND_COOLDOWN_SECONDS = 30
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const navigate = useNavigate()
  const { register, sendCode } = useAuth()

  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    code: '',
    password: '',
    confirm: '',
    invite: '',
  })

  const [codeStatus, setCodeStatus] = useState({ kind: 'idle', message: '' })
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [toast, setToast] = useState(null)

  // Cooldown countdown for the "Get code" button.
  useEffect(() => {
    if (codeCooldown <= 0) return undefined
    const id = setInterval(() => {
      setCodeCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [codeCooldown])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const isEmailValid = EMAIL_RX.test(form.email.trim())
  const canRequestCode = isEmailValid && codeCooldown === 0 && codeStatus.kind !== 'sending'

  const handleGetCode = async () => {
    if (!canRequestCode) return
    setCodeStatus({ kind: 'sending', message: 'Sending code…' })
    try {
      await sendCode(form.email.trim().toLowerCase())
      setCodeStatus({ kind: 'idle', message: '' })
      setToast({
        kind: 'success',
        message: 'Code sent — check your inbox (and spam).',
        id: Date.now(),
      })
      setCodeCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setCodeStatus({ kind: 'idle', message: '' })
      setToast({
        kind: 'error',
        message: err?.message || 'Failed to send verification code.',
        id: Date.now(),
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setSubmitError(null)

    if (!form.name.trim() || !form.surname.trim()) {
      return setSubmitError('Name and surname are required.')
    }
    if (!isEmailValid) {
      return setSubmitError('Please enter a valid e-mail.')
    }
    if (!form.code.trim()) {
      return setSubmitError('Verification code is required — press "Get code" first.')
    }
    if (form.password.length < 6) {
      return setSubmitError('Password must be at least 6 characters.')
    }
    if (form.password !== form.confirm) {
      return setSubmitError('Passwords do not match.')
    }

    setSubmitting(true)
    try {
      await register({
        name: form.name.trim(),
        surname: form.surname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        verificationCode: form.code.trim(),
        invitationCode: form.invite.trim() || undefined,
      })
      navigate('/trading', { replace: true })
    } catch (err) {
      setSubmitError(err?.message || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      {toast && (
        <Toast
          key={toast.id}
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <div className="auth-showcase" aria-hidden="true">
        <img src={laptop} alt="" />
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <header className="auth-heading">
            <h1 className="auth-title auth-title--register">Registration</h1>
            <p className="auth-subtitle">
              Create an account to start trading on our next-generation platform.
            </p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label auth-label--strong" htmlFor="name">
                  Name
                </label>
                <div className="auth-input">
                  <input
                    id="name"
                    type="text"
                    autoComplete="given-name"
                    value={form.name}
                    onChange={update('name')}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label auth-label--strong" htmlFor="surname">
                  Surname
                </label>
                <div className="auth-input">
                  <input
                    id="surname"
                    type="text"
                    autoComplete="family-name"
                    value={form.surname}
                    onChange={update('surname')}
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label auth-label--strong" htmlFor="email">
                E-mail
              </label>
              <div className="auth-input auth-input--with-action">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update('email')}
                />
                <button
                  type="button"
                  className="auth-input__inline-btn"
                  onClick={handleGetCode}
                  disabled={!canRequestCode}
                >
                  {codeStatus.kind === 'sending'
                    ? 'Sending…'
                    : codeCooldown > 0
                      ? `Resend (${codeCooldown}s)`
                      : 'Get code'}
                </button>
              </div>
              {codeStatus.kind === 'sending' && (
                <div className="auth-helper auth-helper--sending" role="status">
                  {codeStatus.message}
                </div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label auth-label--strong" htmlFor="code">
                Verification code
              </label>
              <div className="auth-input">
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={form.code}
                  onChange={update('code')}
                  placeholder="6-digit code from e-mail"
                />
              </div>
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label auth-label--strong" htmlFor="password">
                  Password
                </label>
                <div className="auth-input">
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update('password')}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label auth-label--strong" htmlFor="confirm">
                  Confirm your password
                </label>
                <div className="auth-input">
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={update('confirm')}
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label auth-label--strong">
                <span>Invitation code</span>
                <span className="auth-label__optional">(optional)</span>
              </div>
              <div className="auth-input">
                <input
                  id="invite"
                  type="text"
                  value={form.invite}
                  onChange={update('invite')}
                />
              </div>
            </div>

            {submitError && <div className="auth-error">{submitError}</div>}

            <button
              type="submit"
              className="auth-button auth-button--strong"
              disabled={submitting}
            >
              {submitting ? 'Registering…' : 'Registration'}
            </button>
          </form>

          <p className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login">Return to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
