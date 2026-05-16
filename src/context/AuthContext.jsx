import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  loginUser,
  registerUser,
  sendVerificationCode as apiSendVerificationCode,
} from '../api/auth'

const STORAGE_KEY = 'updownx.auth'

const AuthContext = createContext(null)

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(value) {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore quota / privacy mode failures
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStored())

  // Keep localStorage in sync if auth changes elsewhere.
  useEffect(() => {
    writeStored(auth)
  }, [auth])

  const login = useCallback(async ({ email, password }) => {
    const data = await loginUser({ email, password })
    setAuth({ user: data.user, token: data.token })
    return data.user
  }, [])

  const register = useCallback(async (form) => {
    const data = await registerUser(form)
    setAuth({ user: data.user, token: data.token })
    return data.user
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
  }, [])

  const sendCode = useCallback((email) => apiSendVerificationCode(email), [])

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.token),
      login,
      register,
      logout,
      sendCode,
    }),
    [auth, login, register, logout, sendCode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
