// Canonical list of 100 supported coins.
//
// Fields:
//   symbol  - exchange ticker (used to look up Binance pairs)
//   name    - human-readable name
//   tv      - TradingView symbol for the embedded chart widget
//             (mostly `BINANCE:{symbol}USDT`)

const RAW_COINS = [
  ['BTC', 'Bitcoin'],
  ['ETH', 'Ethereum'],
  ['USDT', 'Tether'],
  ['BNB', 'BNB'],
  ['SOL', 'Solana'],
  ['XRP', 'XRP'],
  ['USDC', 'USD Coin'],
  ['ADA', 'Cardano'],
  ['DOGE', 'Dogecoin'],
  ['TON', 'Toncoin'],
  ['TRX', 'TRON'],
  ['AVAX', 'Avalanche'],
  ['SHIB', 'Shiba Inu'],
  ['DOT', 'Polkadot'],
  ['LINK', 'Chainlink'],
  ['BCH', 'Bitcoin Cash'],
  ['MATIC', 'Polygon'],
  ['LTC', 'Litecoin'],
  ['ICP', 'Internet Computer'],
  ['UNI', 'Uniswap'],
  ['XLM', 'Stellar'],
  ['ATOM', 'Cosmos'],
  ['ETC', 'Ethereum Classic'],
  ['HBAR', 'Hedera'],
  ['FIL', 'Filecoin'],
  ['APT', 'Aptos'],
  ['ARB', 'Arbitrum'],
  ['VET', 'VeChain'],
  ['CRO', 'Cronos'],
  ['NEAR', 'NEAR Protocol'],
  ['ALGO', 'Algorand'],
  ['QNT', 'Quant'],
  ['MNT', 'Mantle'],
  ['OP', 'Optimism'],
  ['GRT', 'The Graph'],
  ['MKR', 'Maker'],
  ['AAVE', 'Aave'],
  ['KAS', 'Kaspa'],
  ['RNDR', 'Render'],
  ['IMX', 'Immutable'],
  ['RPL', 'Rocket Pool'],
  ['INJ', 'Injective'],
  ['FTM', 'Fantom'],
  ['EGLD', 'MultiversX'],
  ['SEI', 'Sei'],
  ['SUI', 'Sui'],
  ['STX', 'Stacks'],
  ['FLOW', 'Flow'],
  ['XTZ', 'Tezos'],
  ['THETA', 'Theta Network'],
  ['MANA', 'Decentraland'],
  ['SAND', 'Sandbox'],
  ['AXS', 'Axie Infinity'],
  ['GALA', 'Gala'],
  ['CHZ', 'Chiliz'],
  ['EOS', 'EOS'],
  ['NEO', 'Neo'],
  ['ZEC', 'Zcash'],
  ['DASH', 'Dash'],
  ['IOTA', 'IOTA'],
  ['WAVES', 'Waves'],
  ['KAVA', 'Kava'],
  ['HNT', 'Helium'],
  ['MINA', 'Mina'],
  ['CFX', 'Conflux'],
  ['LRC', 'Loopring'],
  ['BAT', 'Basic Attention Token'],
  ['ENJ', 'Enjin Coin'],
  ['ZIL', 'Zilliqa'],
  ['QTUM', 'Qtum'],
  ['ONE', 'Harmony'],
  ['CKB', 'Nervos Network'],
  ['ROSE', 'Oasis Network'],
  ['1INCH', '1inch'],
  ['CRV', 'Curve DAO Token'],
  ['SNX', 'Synthetix'],
  ['BAL', 'Balancer'],
  ['YFI', 'Yearn Finance'],
  ['COMP', 'Compound'],
  ['GMX', 'GMX'],
  ['DYDX', 'dYdX'],
  ['CAKE', 'PancakeSwap'],
  ['TWT', 'Trust Wallet Token'],
  ['LUNC', 'Terra Classic'],
  ['LUNA', 'Terra'],
  ['RON', 'Ronin'],
  ['AR', 'Arweave'],
  ['WOO', 'WOO Network'],
  ['RVN', 'Ravencoin'],
  ['ICX', 'ICON'],
  ['AUDIO', 'Audius'],
  ['ANKR', 'Ankr'],
  ['LPT', 'Livepeer'],
  ['API3', 'API3'],
  ['BAND', 'Band Protocol'],
  ['CELO', 'Celo'],
  ['RSR', 'Reserve Rights'],
  ['SKL', 'SKALE'],
  ['OCEAN', 'Ocean Protocol'],
  ['FLUX', 'Flux'],
]

// Deterministic, hash-based gradient so every coin gets a distinct
// colour combo without us having to hand-pick 100 palettes. Used only
// by the fallback letter avatar in CoinIcon.
function colorsFor(symbol) {
  let hash = 0
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  const hue2 = (hue + 35) % 360
  return [
    `hsl(${hue}, 78%, 56%)`,
    `hsl(${hue2}, 72%, 38%)`,
  ]
}

export const COINS = RAW_COINS.map(([symbol, name]) => ({
  symbol,
  name,
  tv: `BINANCE:${symbol}USDT`,
  colors: colorsFor(symbol),
}))

export const COIN_BY_SYMBOL = COINS.reduce((acc, c) => {
  acc[c.symbol] = c
  return acc
}, {})

// First 10 coins — used in the sidebar Markets card.
export const SIDEBAR_COINS = COINS.slice(0, 10)

// First 12 coins — used to populate the Live Trades sample feed.
export const TRADE_COINS = COINS.slice(0, 12)
