import { useState } from 'react'
import { Pagination, TradeButton } from './_shared'
import CoinIcon from '../components/CoinIcon'
import useBinancePrices, {
  formatPrice,
  formatVolume,
  formatChange,
} from '../hooks/useBinancePrices'
import { COINS } from '../data/coins'
import '../components/AppLayout.css'

const PAGE_SIZE = 13

// Binance API uses the same `${SYMBOL}USDT` pairing convention as the
// `tv` field in our coin data; for stables we point at USD pairs that
// don't exist on Binance, so they simply fall back to "—".
function binanceSymbolFor(coin) {
  return `${coin.symbol}USDT`
}

export default function Markets() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const { tickers, loading } = useBinancePrices()

  const filtered = COINS.filter(
    (c) =>
      c.symbol.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase()),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const COLS = '1.5fr 1fr 1fr 1.5fr 100px'

  return (
    <section className="content-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 className="page-title">Markets</h1>
          {loading && (
            <span style={{ font: '500 12px/1 var(--app-font)', color: 'var(--app-text-muted)' }}>
              loading prices…
            </span>
          )}
        </div>
        <input
          type="search"
          placeholder="Search coin..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          style={{
            background: 'var(--app-row-bg)',
            border: '1px solid var(--app-border-soft)',
            borderRadius: 8,
            color: 'var(--app-text)',
            font: '500 13px/1 var(--app-font)',
            padding: '10px 14px',
            width: 220,
            outline: 'none',
          }}
        />
      </div>

      <div className="data-table">
        <div className="data-table__head" style={{ gridTemplateColumns: COLS }}>
          <span>Asset</span>
          <span>Price</span>
          <span>Change 24H</span>
          <span>Volume 24H ( USDT)</span>
          <span style={{ textAlign: 'right' }}>Trade</span>
        </div>

        {rows.map((coin) => {
          const t = tickers[binanceSymbolFor(coin)]
          const change = t ? t.priceChangePercent : null
          const positiveChange = change != null && change >= 0

          return (
            <div key={coin.symbol} className="data-table__row" style={{ gridTemplateColumns: COLS }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CoinIcon symbol={coin.symbol} />
                <span className="cell">
                  <span className="market-row__symbol">{coin.symbol}</span>
                  <span className="market-row__pair">/USDT</span>
                </span>
              </span>
              <span className="cell">
                {t ? `$${formatPrice(t.lastPrice)}` : '—'}
              </span>
              <span
                className={`cell ${
                  change == null ? '' : positiveChange ? 'cell--up' : 'cell--down'
                }`}
              >
                {formatChange(change)}
              </span>
              <span className="cell">
                {t ? formatVolume(t.quoteVolume) : '—'}
              </span>
              <span style={{ textAlign: 'right' }}>
                <TradeButton />
              </span>
            </div>
          )
        })}
      </div>

      <Pagination
        total={filtered.length}
        page={safePage}
        pageSize={PAGE_SIZE}
        onPage={setPage}
        totalPages={totalPages}
      />
    </section>
  )
}
