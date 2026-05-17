import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

// ─── Trading economics ──────────────────────────────────────────────
export const FEE_RATE = 0
export const PAYOUT_PROFIT_PCT = 0.92
export const PAYOUT_MULT = 1 + PAYOUT_PROFIT_PCT
export const MIN_STAKE = 1
export const MAX_STAKE = 20000
export const STARTING_BALANCE = 1000

const STORAGE_KEY = (userId) => `updownx.trading.${userId}`

async function fetchPrice(symbol) {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}USDT`,
  )
  if (!res.ok) throw new Error(`Price fetch failed (${res.status})`)
  const data = await res.json()
  const price = parseFloat(data.price)
  if (!Number.isFinite(price)) throw new Error('Invalid price returned')
  return price
}

function readState(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.balance === 'number' &&
      Array.isArray(parsed?.positions)
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeState(userId, state) {
  if (!userId) return
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

const TradingContext = createContext(null)

export function TradingProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState(() => {
    const stored = readState(userId)
    if (stored) return stored
    return { balance: userId != null ? STARTING_BALANCE : 0, positions: [] }
  })

  // Reset on user change (logout / re-login as different account).
  useEffect(() => {
    if (userId == null) {
      setState({ balance: 0, positions: [] })
      return
    }
    const stored = readState(userId)
    setState(stored ?? { balance: STARTING_BALANCE, positions: [] })
  }, [userId])

  // Persist any change.
  useEffect(() => {
    if (userId != null) writeState(userId, state)
  }, [userId, state])

  // De-duplicate concurrent settlement attempts.
  const settlingRef = useRef(new Set())

  // Settle expired positions every second.
  useEffect(() => {
    if (userId == null) return undefined

    const tick = async () => {
      const now = Date.now()
      const expired = state.positions.filter(
        (p) =>
          p.status === 'open' &&
          p.expiresAt <= now &&
          !settlingRef.current.has(p.id),
      )

      for (const p of expired) {
        settlingRef.current.add(p.id)
        try {
          const closePrice = await fetchPrice(p.symbol)
          const won =
            (p.dir === 'up' && closePrice > p.entryPrice) ||
            (p.dir === 'down' && closePrice < p.entryPrice)
          setState((prev) => {
            const positions = prev.positions.map((q) =>
              q.id === p.id
                ? {
                    ...q,
                    status: won ? 'won' : 'lost',
                    closePrice,
                    closedAt: Date.now(),
                  }
                : q,
            )
            const credit = won ? p.amount * PAYOUT_MULT : 0
            return {
              ...prev,
              positions,
              balance: prev.balance + credit,
            }
          })
        } catch {
          setState((prev) => {
            const positions = prev.positions.map((q) =>
              q.id === p.id
                ? { ...q, status: 'cancelled', closedAt: Date.now() }
                : q,
            )
            return {
              ...prev,
              positions,
              balance: prev.balance + p.amount + p.fee,
            }
          })
        } finally {
          settlingRef.current.delete(p.id)
        }
      }
    }

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [userId, state.positions])

  const deposit = useCallback(
    (amount) => {
      if (userId == null) throw new Error('Sign in to make a deposit.')
      const num = Number(amount)
      if (!Number.isFinite(num) || num <= 0) throw new Error('Enter a positive amount.')
      if (num > 1_000_000) throw new Error('Maximum deposit is $1,000,000.')
      setState((prev) => ({
        ...prev,
        balance: +(prev.balance + num).toFixed(2),
      }))
      return num
    },
    [userId],
  )

  const withdraw = useCallback(
    (amount) => {
      if (userId == null) throw new Error('Sign in to withdraw.')
      const num = Number(amount)
      if (!Number.isFinite(num) || num <= 0) throw new Error('Enter a positive amount.')
      if (num > state.balance) throw new Error('Insufficient balance.')
      setState((prev) => ({
        ...prev,
        balance: +(prev.balance - num).toFixed(2),
      }))
      return num
    },
    [userId, state.balance],
  )

  const openPosition = useCallback(
    async ({ symbol, dir, amount, durationSec }) => {
      if (userId == null) throw new Error('Sign in to open positions.')
      if (!Number.isFinite(amount) || amount < MIN_STAKE) {
        throw new Error(`Minimum stake is $${MIN_STAKE}.`)
      }
      if (amount > MAX_STAKE) {
        throw new Error(`Maximum stake is $${MAX_STAKE}.`)
      }
      if (!['up', 'down'].includes(dir)) {
        throw new Error('Direction must be "up" or "down".')
      }

      const fee = +(amount * FEE_RATE).toFixed(4)
      if (state.balance < amount + fee) {
        throw new Error('Insufficient balance.')
      }

      const entryPrice = await fetchPrice(symbol)
      const now = Date.now()
      const position = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        symbol,
        dir,
        amount,
        fee,
        entryPrice,
        durationSec,
        openedAt: now,
        expiresAt: now + durationSec * 1000,
        status: 'open',
      }

      setState((prev) => ({
        balance: prev.balance - amount - fee,
        positions: [position, ...prev.positions],
      }))

      return position
    },
    [userId, state.balance],
  )

  const value = useMemo(() => {
    const openPositions = state.positions.filter((p) => p.status === 'open')
    const closedPositions = state.positions.filter((p) => p.status !== 'open')
    return {
      balance: state.balance,
      positions: state.positions,
      openPositions,
      closedPositions,
      openPosition,
      deposit,
      withdraw,
    }
  }, [state, openPosition, deposit, withdraw])

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
}

export function useTrading() {
  const ctx = useContext(TradingContext)
  if (!ctx) throw new Error('useTrading must be used inside <TradingProvider>')
  return ctx
}

export default useTrading
