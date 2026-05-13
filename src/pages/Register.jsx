import { useState } from 'react'
import { Link } from 'react-router-dom'
import laptop from '../assets/auth/laptop.png'
import './auth.css'

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    code: '',
    password: '',
    confirm: '',
    invite: '',
  })

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: hook up real registration
    console.log('Registration attempt:', { ...form, password: '***', confirm: '***' })
  }

  const handleGetCode = () => {
    // TODO: trigger email verification code request
    console.log('Get code for:', form.email)
  }

  return (
    <div className="auth-page">
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
                  disabled={!form.email}
                >
                  Get code
                </button>
              </div>
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

            <button type="submit" className="auth-button auth-button--strong">
              Registration
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
