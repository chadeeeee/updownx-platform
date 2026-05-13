import { useState } from 'react'
import { COIN_BY_SYMBOL } from '../data/coins'

/**
 * Public crypto-icon CDN. Most major coins have an SVG asset there;
 * symbols not present will simply 404 and we drop back to the
 * gradient-letter circle.
 */
function iconUrl(symbol) {
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${symbol.toLowerCase()}.svg`
}

/**
 * CoinIcon — first tries to render the real coin logo from a CDN.
 * Falls back to a gradient circle with the first letter of the symbol
 * when no asset is available (offline / 404 / unknown coin).
 */
export default function CoinIcon({ symbol, size = 28, className = '', style }) {
  const [errored, setErrored] = useState(false)

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
    ...style,
  }

  if (!errored && symbol) {
    return (
      <img
        src={iconUrl(symbol)}
        alt={symbol}
        width={size}
        height={size}
        loading="lazy"
        className={`coin-icon ${className}`}
        style={baseStyle}
        onError={() => setErrored(true)}
      />
    )
  }

  // Fallback: gradient circle with first letter.
  const coin = COIN_BY_SYMBOL[symbol]
  const [a, b] = coin?.colors ?? ['#475569', '#1e293b']
  return (
    <span
      className={`coin-icon ${className}`}
      style={{
        ...baseStyle,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 900,
        fontSize: Math.max(9, Math.round(size * 0.4)),
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
      }}
    >
      {symbol ? symbol[0] : '?'}
    </span>
  )
}
