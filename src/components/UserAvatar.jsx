// Deterministic colored avatar — colour depends on hash of the name,
// label is the first letter (or two initials) of the name.

const PALETTE = [
  ['#00ffa3', '#0d8067'],
  ['#7c5cff', '#3b2bb3'],
  ['#ff8a4c', '#a8480f'],
  ['#ff5c8a', '#a3265a'],
  ['#3b9eff', '#13548d'],
  ['#fbbf24', '#a86a05'],
  ['#34d399', '#0e6b51'],
  ['#a78bfa', '#5b3aa8'],
  ['#f472b6', '#9d3170'],
  ['#22d3ee', '#0c6f7a'],
]

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default function UserAvatar({ name = '', size = 26, style }) {
  const palette = PALETTE[hashString(name || 'anon') % PALETTE.length]
  const [a, b] = palette

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${a}, ${b})`,
        color: '#0b0f14',
        font: `900 ${Math.max(9, Math.round(size * 0.42))}px/1 'Inter', system-ui, sans-serif`,
        textShadow: '0 1px 0 rgba(255, 255, 255, 0.25)',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.15)',
        ...style,
      }}
    >
      {initialsFor(name)}
    </span>
  )
}
