// Pool of crypto-flavored trader handles used to populate the leaderboard
// and the live trading activity feed. Stable across renders so a given handle
// always shows the same avatar color.

export const TRADER_HANDLES = [
  'SatoshiX',
  'NeoLambo',
  'BlockMage',
  'AlphaWolf',
  'PixelPump',
  'OnChainOwl',
  'CipherKai',
  'BullishBee',
  'RektQueen',
  'HodlHero',
  'NovaTrader',
  'ZeroSlippage',
  'LunaCub',
  'PumpDaddy',
  'OctoHands',
  'YieldYoda',
  'WickWalker',
  'TickerTitan',
  'OrbitFox',
  'CryptoKaiju',
]

const AVATAR_PALETTE = [
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

export function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function avatarColors(handle) {
  return AVATAR_PALETTE[hashString(handle) % AVATAR_PALETTE.length]
}

export function avatarInitials(handle) {
  const cleaned = handle.replace(/^@/, '').trim()
  const capitals = cleaned.match(/[A-Z]/g)
  if (capitals && capitals.length >= 2) return capitals.slice(0, 2).join('')
  return cleaned.slice(0, 2).toUpperCase()
}
