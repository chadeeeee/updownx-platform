import { useEffect, useMemo, useRef, useState } from 'react'
import CoinIcon from './CoinIcon'
import { COINS, COIN_BY_SYMBOL } from '../data/coins'
import './CoinPicker.css'

/**
 * CoinPicker — custom dropdown for choosing a coin out of the
 * canonical 100-coin list. Renders a trigger button showing the
 * currently selected coin, and on click opens a popover with a search
 * input + scrollable list of coins (icon, symbol, full name).
 *
 * Props:
 *   value     - currently selected symbol (e.g. "BTC")
 *   onChange  - (symbol) => void; called when the user picks a coin
 */
export default function CoinPicker({ value = 'BTC', onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const current = COIN_BY_SYMBOL[value] ?? COINS[0]

  // Close the popover when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return undefined

    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Focus the search input as soon as the popover opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COINS
    return COINS.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    )
  }, [query])

  const select = (symbol) => {
    if (onChange) onChange(symbol)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="coin-picker" ref={rootRef}>
      <button
        type="button"
        className={`coin-picker__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CoinIcon symbol={current.symbol} size={26} />
        <span className="coin-picker__label">
          <span className="coin-picker__symbol">{current.symbol}</span>
          <span className="coin-picker__pair">/USDT</span>
        </span>
        <span className="coin-picker__name">{current.name}</span>
        <svg
          className="coin-picker__chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div className="coin-picker__popover" role="listbox">
          <div className="coin-picker__search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m11 11 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              placeholder="Search coin or symbol..."
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="coin-picker__list">
            {filtered.length === 0 && (
              <div className="coin-picker__empty">No coins match "{query}"</div>
            )}
            {filtered.map((c) => {
              const isActive = c.symbol === value
              return (
                <button
                  key={c.symbol}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`coin-picker__row${isActive ? ' is-active' : ''}`}
                  onClick={() => select(c.symbol)}
                >
                  <CoinIcon symbol={c.symbol} size={26} />
                  <span className="coin-picker__row-text">
                    <span className="coin-picker__row-symbol">{c.symbol}</span>
                    <span className="coin-picker__row-name">{c.name}</span>
                  </span>
                  <span className="coin-picker__row-pair">/USDT</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
