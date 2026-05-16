import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const MarketContext = createContext(null)

const DEFAULT_SYMBOL = 'BTC'

export function MarketProvider({ children }) {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)

  const selectSymbol = useCallback((next) => {
    if (typeof next === 'string' && next.length > 0) {
      setSymbol(next.toUpperCase())
    }
  }, [])

  const value = useMemo(
    () => ({
      symbol,
      setSymbol: selectSymbol,
    }),
    [symbol, selectSymbol],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) {
    throw new Error('useMarket must be used inside <MarketProvider>')
  }
  return ctx
}
