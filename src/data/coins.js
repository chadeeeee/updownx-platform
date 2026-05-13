// Top 100 cryptocurrencies. The `tv` field is the TradingView symbol
// (mostly BINANCE pairs against USDT). The `colors` field describes the
// CSS-only icon gradient used in the sidebar / tables.

export const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', tv: 'BINANCE:BTCUSDT', colors: ['#f7931a', '#c47408'] },
  { symbol: 'ETH', name: 'Ethereum', tv: 'BINANCE:ETHUSDT', colors: ['#627eea', '#3c52a3'] },
  { symbol: 'USDT', name: 'Tether', tv: 'BINANCE:BUSDUSDT', colors: ['#26a17b', '#1d7e5e'] },
  { symbol: 'BNB', name: 'BNB', tv: 'BINANCE:BNBUSDT', colors: ['#f3ba2f', '#c5961f'] },
  { symbol: 'SOL', name: 'Solana', tv: 'BINANCE:SOLUSDT', colors: ['#9945ff', '#14f195'] },
  { symbol: 'XRP', name: 'XRP', tv: 'BINANCE:XRPUSDT', colors: ['#1c1f23', '#565555'] },
  { symbol: 'USDC', name: 'USD Coin', tv: 'BINANCE:USDCUSDT', colors: ['#2775ca', '#1856a0'] },
  { symbol: 'ADA', name: 'Cardano', tv: 'BINANCE:ADAUSDT', colors: ['#0033ad', '#001f6e'] },
  { symbol: 'DOGE', name: 'Dogecoin', tv: 'BINANCE:DOGEUSDT', colors: ['#c2a633', '#8c7a23'] },
  { symbol: 'TON', name: 'Toncoin', tv: 'BINANCE:TONUSDT', colors: ['#0098ea', '#0076b8'] },

  { symbol: 'TRX', name: 'TRON', tv: 'BINANCE:TRXUSDT', colors: ['#ff060a', '#b10408'] },
  { symbol: 'AVAX', name: 'Avalanche', tv: 'BINANCE:AVAXUSDT', colors: ['#e84142', '#a52f30'] },
  { symbol: 'SHIB', name: 'Shiba Inu', tv: 'BINANCE:SHIBUSDT', colors: ['#ffa409', '#c47800'] },
  { symbol: 'DOT', name: 'Polkadot', tv: 'BINANCE:DOTUSDT', colors: ['#e6007a', '#9d0055'] },
  { symbol: 'LINK', name: 'Chainlink', tv: 'BINANCE:LINKUSDT', colors: ['#2a5ada', '#1d3f99'] },
  { symbol: 'BCH', name: 'Bitcoin Cash', tv: 'BINANCE:BCHUSDT', colors: ['#0ac18e', '#078264'] },
  { symbol: 'MATIC', name: 'Polygon', tv: 'BINANCE:MATICUSDT', colors: ['#8247e5', '#5a31a3'] },
  { symbol: 'LTC', name: 'Litecoin', tv: 'BINANCE:LTCUSDT', colors: ['#bfbbbb', '#6c6c6c'] },
  { symbol: 'ICP', name: 'Internet Computer', tv: 'BINANCE:ICPUSDT', colors: ['#f15a24', '#a93b16'] },
  { symbol: 'UNI', name: 'Uniswap', tv: 'BINANCE:UNIUSDT', colors: ['#ff007a', '#b50057'] },

  { symbol: 'XLM', name: 'Stellar', tv: 'BINANCE:XLMUSDT', colors: ['#08b5e5', '#0584a8'] },
  { symbol: 'ATOM', name: 'Cosmos', tv: 'BINANCE:ATOMUSDT', colors: ['#5064fb', '#3445b3'] },
  { symbol: 'ETC', name: 'Ethereum Classic', tv: 'BINANCE:ETCUSDT', colors: ['#3ab83a', '#286c28'] },
  { symbol: 'HBAR', name: 'Hedera', tv: 'BINANCE:HBARUSDT', colors: ['#3a3a3a', '#1a1a1a'] },
  { symbol: 'FIL', name: 'Filecoin', tv: 'BINANCE:FILUSDT', colors: ['#0090ff', '#0064b3'] },
  { symbol: 'APT', name: 'Aptos', tv: 'BINANCE:APTUSDT', colors: ['#1f1f1f', '#444444'] },
  { symbol: 'ARB', name: 'Arbitrum', tv: 'BINANCE:ARBUSDT', colors: ['#28a0f0', '#1873b3'] },
  { symbol: 'VET', name: 'VeChain', tv: 'BINANCE:VETUSDT', colors: ['#15bdff', '#0a8cbf'] },
  { symbol: 'CRO', name: 'Cronos', tv: 'BINANCE:CROUSDT', colors: ['#002d74', '#001a45'] },
  { symbol: 'NEAR', name: 'NEAR Protocol', tv: 'BINANCE:NEARUSDT', colors: ['#000000', '#444444'] },

  { symbol: 'ALGO', name: 'Algorand', tv: 'BINANCE:ALGOUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'QNT', name: 'Quant', tv: 'BINANCE:QNTUSDT', colors: ['#3a3a3a', '#1a1a1a'] },
  { symbol: 'MNT', name: 'Mantle', tv: 'BINANCE:MNTUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'OP', name: 'Optimism', tv: 'BINANCE:OPUSDT', colors: ['#ff0420', '#a30315'] },
  { symbol: 'GRT', name: 'The Graph', tv: 'BINANCE:GRTUSDT', colors: ['#6f4cff', '#4a32b3'] },
  { symbol: 'MKR', name: 'Maker', tv: 'BINANCE:MKRUSDT', colors: ['#1abc9c', '#108a72'] },
  { symbol: 'AAVE', name: 'Aave', tv: 'BINANCE:AAVEUSDT', colors: ['#b6509e', '#7d3a6e'] },
  { symbol: 'KAS', name: 'Kaspa', tv: 'BINANCE:KASUSDT', colors: ['#70c7ba', '#458b81'] },
  { symbol: 'RNDR', name: 'Render', tv: 'BINANCE:RNDRUSDT', colors: ['#cf1f49', '#8b1532'] },
  { symbol: 'IMX', name: 'Immutable', tv: 'BINANCE:IMXUSDT', colors: ['#0d68a1', '#093f63'] },

  { symbol: 'RPL', name: 'Rocket Pool', tv: 'BINANCE:RPLUSDT', colors: ['#ff7b4f', '#b34f2f'] },
  { symbol: 'INJ', name: 'Injective', tv: 'BINANCE:INJUSDT', colors: ['#0086e5', '#005ca0'] },
  { symbol: 'FTM', name: 'Fantom', tv: 'BINANCE:FTMUSDT', colors: ['#1969ff', '#0e44a3'] },
  { symbol: 'EGLD', name: 'MultiversX', tv: 'BINANCE:EGLDUSDT', colors: ['#23f7dd', '#15a89a'] },
  { symbol: 'SEI', name: 'Sei', tv: 'BINANCE:SEIUSDT', colors: ['#9d1f19', '#651411'] },
  { symbol: 'SUI', name: 'Sui', tv: 'BINANCE:SUIUSDT', colors: ['#4ca3ff', '#1c6cb3'] },
  { symbol: 'STX', name: 'Stacks', tv: 'BINANCE:STXUSDT', colors: ['#5546ff', '#3a30b3'] },
  { symbol: 'FLOW', name: 'Flow', tv: 'BINANCE:FLOWUSDT', colors: ['#00ef8b', '#009655'] },
  { symbol: 'XTZ', name: 'Tezos', tv: 'BINANCE:XTZUSDT', colors: ['#2c7df7', '#1f57b3'] },
  { symbol: 'THETA', name: 'Theta Network', tv: 'BINANCE:THETAUSDT', colors: ['#2ab8e6', '#1c81a3'] },

  { symbol: 'MANA', name: 'Decentraland', tv: 'BINANCE:MANAUSDT', colors: ['#ff2d55', '#a31d37'] },
  { symbol: 'SAND', name: 'Sandbox', tv: 'BINANCE:SANDUSDT', colors: ['#00adef', '#0078a8'] },
  { symbol: 'AXS', name: 'Axie Infinity', tv: 'BINANCE:AXSUSDT', colors: ['#0055d4', '#003a93'] },
  { symbol: 'GALA', name: 'Gala', tv: 'BINANCE:GALAUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'CHZ', name: 'Chiliz', tv: 'BINANCE:CHZUSDT', colors: ['#cd0124', '#7f0117'] },
  { symbol: 'EOS', name: 'EOS', tv: 'BINANCE:EOSUSDT', colors: ['#1d1d1d', '#4a4a4a'] },
  { symbol: 'NEO', name: 'Neo', tv: 'BINANCE:NEOUSDT', colors: ['#58bf00', '#3a8000'] },
  { symbol: 'ZEC', name: 'Zcash', tv: 'BINANCE:ZECUSDT', colors: ['#ecb244', '#a17a2c'] },
  { symbol: 'DASH', name: 'Dash', tv: 'BINANCE:DASHUSDT', colors: ['#008ce7', '#005d99'] },
  { symbol: 'IOTA', name: 'IOTA', tv: 'BINANCE:IOTAUSDT', colors: ['#242424', '#000000'] },

  { symbol: 'WAVES', name: 'Waves', tv: 'BINANCE:WAVESUSDT', colors: ['#0055ff', '#003ab3'] },
  { symbol: 'KAVA', name: 'Kava', tv: 'BINANCE:KAVAUSDT', colors: ['#ff433e', '#a52d2a'] },
  { symbol: 'HNT', name: 'Helium', tv: 'BINANCE:HNTUSDT', colors: ['#474dff', '#2e33b3'] },
  { symbol: 'MINA', name: 'Mina', tv: 'BINANCE:MINAUSDT', colors: ['#8a72ff', '#594bb3'] },
  { symbol: 'CFX', name: 'Conflux', tv: 'BINANCE:CFXUSDT', colors: ['#7ed321', '#558f15'] },
  { symbol: 'LRC', name: 'Loopring', tv: 'BINANCE:LRCUSDT', colors: ['#1c60ff', '#1043b3'] },
  { symbol: 'BAT', name: 'Basic Attention', tv: 'BINANCE:BATUSDT', colors: ['#ff5000', '#a53400'] },
  { symbol: 'ENJ', name: 'Enjin Coin', tv: 'BINANCE:ENJUSDT', colors: ['#624dbf', '#403282'] },
  { symbol: 'ZIL', name: 'Zilliqa', tv: 'BINANCE:ZILUSDT', colors: ['#49c1bf', '#308482'] },
  { symbol: 'QTUM', name: 'Qtum', tv: 'BINANCE:QTUMUSDT', colors: ['#2e9ad0', '#1c6a91'] },

  { symbol: 'ONE', name: 'Harmony', tv: 'BINANCE:ONEUSDT', colors: ['#00aee9', '#0078a3'] },
  { symbol: 'CKB', name: 'Nervos Network', tv: 'BINANCE:CKBUSDT', colors: ['#3cc68a', '#288759'] },
  { symbol: 'ROSE', name: 'Oasis Network', tv: 'BINANCE:ROSEUSDT', colors: ['#0092f6', '#0064a8'] },
  { symbol: '1INCH', name: '1inch', tv: 'BINANCE:1INCHUSDT', colors: ['#1b314f', '#0d1a2a'] },
  { symbol: 'CRV', name: 'Curve DAO', tv: 'BINANCE:CRVUSDT', colors: ['#ed1717', '#a30f0f'] },
  { symbol: 'SNX', name: 'Synthetix', tv: 'BINANCE:SNXUSDT', colors: ['#5fcdf9', '#2e96bf'] },
  { symbol: 'BAL', name: 'Balancer', tv: 'BINANCE:BALUSDT', colors: ['#ffffff', '#9ca3af'] },
  { symbol: 'YFI', name: 'Yearn Finance', tv: 'BINANCE:YFIUSDT', colors: ['#0073ff', '#004fb3'] },
  { symbol: 'COMP', name: 'Compound', tv: 'BINANCE:COMPUSDT', colors: ['#00d395', '#009065'] },
  { symbol: 'GMX', name: 'GMX', tv: 'BINANCE:GMXUSDT', colors: ['#3d51a3', '#28366e'] },

  { symbol: 'DYDX', name: 'dYdX', tv: 'BINANCE:DYDXUSDT', colors: ['#6966ff', '#4644b3'] },
  { symbol: 'CAKE', name: 'PancakeSwap', tv: 'BINANCE:CAKEUSDT', colors: ['#d1884f', '#8e5c33'] },
  { symbol: 'TWT', name: 'Trust Wallet', tv: 'BINANCE:TWTUSDT', colors: ['#3375bb', '#23528a'] },
  { symbol: 'LUNC', name: 'Terra Classic', tv: 'BINANCE:LUNCUSDT', colors: ['#fdd459', '#b39831'] },
  { symbol: 'LUNA', name: 'Terra', tv: 'BINANCE:LUNAUSDT', colors: ['#172852', '#0a1530'] },
  { symbol: 'RON', name: 'Ronin', tv: 'BINANCE:RONUSDT', colors: ['#1273ea', '#0c4f9e'] },
  { symbol: 'AR', name: 'Arweave', tv: 'BINANCE:ARUSDT', colors: ['#1d1d1d', '#444444'] },
  { symbol: 'WOO', name: 'WOO Network', tv: 'BINANCE:WOOUSDT', colors: ['#0094ff', '#0064b3'] },
  { symbol: 'RVN', name: 'Ravencoin', tv: 'BINANCE:RVNUSDT', colors: ['#384182', '#252a55'] },
  { symbol: 'ICX', name: 'ICON', tv: 'BINANCE:ICXUSDT', colors: ['#1fc5c9', '#148386'] },

  { symbol: 'AUDIO', name: 'Audius', tv: 'BINANCE:AUDIOUSDT', colors: ['#a445e8', '#6e2e9c'] },
  { symbol: 'ANKR', name: 'Ankr', tv: 'BINANCE:ANKRUSDT', colors: ['#356dff', '#2348a8'] },
  { symbol: 'LPT', name: 'Livepeer', tv: 'BINANCE:LPTUSDT', colors: ['#00a55f', '#00703f'] },
  { symbol: 'API3', name: 'API3', tv: 'BINANCE:API3USDT', colors: ['#7ce3cb', '#4ca18c'] },
  { symbol: 'BAND', name: 'Band Protocol', tv: 'BINANCE:BANDUSDT', colors: ['#516aff', '#3548b3'] },
  { symbol: 'CELO', name: 'Celo', tv: 'BINANCE:CELOUSDT', colors: ['#fbcc5c', '#b3923f'] },
  { symbol: 'RSR', name: 'Reserve Rights', tv: 'BINANCE:RSRUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'SKL', name: 'SKALE', tv: 'BINANCE:SKLUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'OCEAN', name: 'Ocean Protocol', tv: 'BINANCE:OCEANUSDT', colors: ['#000000', '#3a3a3a'] },
  { symbol: 'FLUX', name: 'Flux', tv: 'BINANCE:FLUXUSDT', colors: ['#2b61d1', '#1c4391'] },
]

// Quick lookup by symbol
export const COIN_BY_SYMBOL = COINS.reduce((acc, c) => {
  acc[c.symbol] = c
  return acc
}, {})

// First 10 coins, used in the shared sidebar Markets list.
export const SIDEBAR_COINS = COINS.slice(0, 10)

// Subset used for "Live Trades" and "Top Coins" sample data.
export const TRADE_COINS = COINS.slice(0, 12)
