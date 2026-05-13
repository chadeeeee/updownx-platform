import { useEffect, useState } from 'react'

/**
 * useBinancePrices — fetches Binance 24h ticker data once on mount and
 * re-fetches on a schedule so the UI shows reasonably fresh prices.
 *
 * Returns a map keyed by Binance symbol (e.g. "BTCUSDT") with shape:
 *   {
 *     lastPrice: number,
 *     priceChangePercent: number,
 *     volume: number,
 *     quoteVolume: number,
 *   }
 *
 * `loading` is true only on the very first request; subsequent
 * background refreshes don't toggle the flag.
 */
export default function useBinancePrices({ refreshMs = 30000 } = {}) {
  const [tickers, setTickers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
        if (!res.ok) throw new Error(`Binance HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return

        const map = {}
        for (const t of data) {
          map[t.symbol] = {
            lastPrice: parseFloat(t.lastPrice),
            priceChangePercent: parseFloat(t.priceChangePercent),
            volume: parseFloat(t.volume),
            quoteVolume: parseFloat(t.quoteVolume),
          }
        }
        setTickers(map)
        setError(null)
      } catch (e) {
        if (alive) setError(e)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, refreshMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [refreshMs])

  return { tickers, loading, error }
}

/**
 * Helper: pretty-print a price using a sensible amount of fractional
 * digits depending on magnitude.
 */
export function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return '—'
  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

/**
 * Helper: pretty-print a 24h volume with thousands separators and
 * trimmed precision.
 */
export function formatVolume(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
}

/**
 * Helper: format a percent change with sign and 2 decimals.
 */
export function formatChange(value) {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
