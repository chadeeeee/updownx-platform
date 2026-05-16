import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── Trading economics ──────────────────────────────────────────────
// Open fee — 0.03% of stake — deducted from balance on UP/DOWN.
export const FEE_RATE = 0.0003
// Win pays back 1.5x stake (original + 50% profit).
export const PAYOUT_MULT = 1.5
// Trade size guardrails per the product brief.
export const MIN_STAKE = 5
export const MAX_STAKE = 2000
// Demo starting balance assigned the first time a user opens the page.
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
    // ignore — quota / privacy mode
  }
}

/**
 * useTrading — owns the per-user trading state (balance + positions).
 * Stake/fee accounting, settlement on expiry, and persistence to
 * localStorage live here so individual pages stay declarative.
 */
export default function useTrading() {
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

  // De-duplicate concurrent settlement attempts when the tick fires before
  // the previous price fetch has finished resolving.
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
          // Network blip — refund stake + fee, mark cancelled.
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

  const openPositions = state.positions.filter((p) => p.status === 'open')
  const closedPositions = state.positions.filter((p) => p.status !== 'open')

  return {
    balance: state.balance,
    positions: state.positions,
    openPositions,
    closedPositions,
    openPosition,
  }
}
