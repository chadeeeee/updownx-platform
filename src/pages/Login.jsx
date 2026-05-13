import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/auth/logo.svg'
import laptop from '../assets/auth/laptop.png'
import './auth.css'

function UserIcon() {
  return (
    <svg width="15" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.49 0-7.5 1.25-7.5 3.75V14a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5v-.75c0-2.5-5.01-3.75-7.5-3.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
      <path
        d="M7 0a4 4 0 0 0-4 4v2H2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V4a4 4 0 0 0-4-4Zm2.5 6h-5V4a2.5 2.5 0 0 1 5 0v2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="18" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
        <path
          d="M10 0C5.5 0 1.7 2.7 0 7c1.7 4.3 5.5 7 10 7s8.3-2.7 10-7c-1.7-4.3-5.5-7-10-7Zm0 11.5A4.5 4.5 0 1 1 14.5 7 4.5 4.5 0 0 1 10 11.5Zm0-7.5A3 3 0 1 0 13 7a3 3 0 0 0-3-3Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg width="18" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
      <path
        d="m2.7.3 17 17-1.4 1.4-3.1-3.1A11 11 0 0 1 10 17C5.5 17 1.7 14 0 9.7a12 12 0 0 1 4.4-5L1.3 1.7 2.7.3ZM10 5a4.7 4.7 0 0 0-2.6.8l1.5 1.5a3 3 0 0 1 3.8 3.8l1.5 1.5A4.7 4.7 0 0 0 10 5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Login() {
  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: hook up real authentication
    console.log('Sign in attempt:', { accountId })
  }

  return (
    <div className="auth-page">
      <div className="auth-showcase" aria-hidden="true">
        <img src={laptop} alt="" />
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand">
            <img className="auth-logo" src={logo} alt="UpdownX" />
            <h1 className="auth-title">Sign In to Your Account</h1>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="accountId">
                Account ID / Login
              </label>
              <div className="auth-input auth-input--with-leading">
                <span className="auth-input__icon">
                  <UserIcon />
                </span>
                <input
                  id="accountId"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="398064"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label">
                <span>Password</span>
                <Link to="/forgot-password" className="auth-link-inline">
                  Forgot Password?
                </Link>
              </div>
              <div className="auth-input auth-input--with-leading auth-input--with-trailing">
                <span className="auth-input__icon">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button">
              Sign In
            </button>
          </form>

          <p className="auth-footer">
            <span>Don&apos;t have an account yet?</span>
            <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
