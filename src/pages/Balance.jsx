import { useState } from 'react'
import { Pagination } from './_shared'
import '../components/AppLayout.css'
import './Balance.css'

const TX = [
  {
    type: 'Deposit',
    dir: 'in',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'completed',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
  {
    type: 'Deposit',
    dir: 'in',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'completed',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
  {
    type: 'Withdraw',
    dir: 'out',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'failed',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
  {
    type: 'Processing',
    dir: 'out',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'pending',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
  {
    type: 'Deposit',
    dir: 'in',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'completed',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
  {
    type: 'Deposit',
    dir: 'in',
    asset: 'USDT',
    network: 'TRC20',
    amount: '500.00',
    status: 'completed',
    date: 'Oct 24, 2023',
    hash: '0x4a...2e1c',
  },
]

const NETWORKS = [
  { value: 'trc20', label: 'Tron (TRC20)' },
  { value: 'erc20', label: 'Ethereum (ERC20)' },
  { value: 'bep20', label: 'BNB Smart Chain (BEP20)' },
  { value: 'sol', label: 'Solana (SPL)' },
]

const ADDRESS = 'TQ3h9f7v...2kL9sP1xZ'

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3v10M4 9l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 13l10-10M13 9V3H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13 3L3 13M3 7v6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v9M4 7l4 4 4-4M3 13h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 6v3M8 11.5h.01M2.7 13h10.6c.8 0 1.3-.9.9-1.6L8.9 2.5a1 1 0 0 0-1.7 0L1.8 11.4c-.4.7.1 1.6.9 1.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Balance() {
  const [network, setNetwork] = useState('trc20')
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore — older browsers without clipboard API
    }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    ADDRESS,
  )}&size=200x200&margin=0`

  const PAGE_SIZE = 4
  const visible = TX.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="balance-page">
      {/* -------------------- Header -------------------- */}
      <header className="balance-page__header">
        <div className="balance-page__header-text">
          <h1 className="page-title">Balance</h1>
          <p className="page-subtitle">
            Manage your funds and recent transactions across all networks.
          </p>
        </div>
        <div className="balance-page__actions">
          <button type="button" className="balance-action-btn balance-action-btn--primary">
            <PlusIcon /> Deposit
          </button>
          <button type="button" className="balance-action-btn">
            <ArrowDownIcon /> Withdraw
          </button>
        </div>
      </header>

      {/* -------------------- Total Balance + Quick Stats -------------------- */}
      <div className="balance-page__top-grid">
        <section className="content-card balance-total">
          <div className="balance-total__bg-mark" aria-hidden="true" />
          <div className="balance-total__label">Total Balance</div>
          <div className="balance-total__amount">
            12,450.80<span>USDT</span>
          </div>
          <div className="balance-total__row">
            <div>
              <div className="balance-total__row-label">Available</div>
              <div className="balance-total__row-value">10,200.00</div>
            </div>
            <div>
              <div className="balance-total__row-label">Locked</div>
              <div className="balance-total__row-value">2,250.80</div>
            </div>
            <div>
              <div className="balance-total__row-label">24h Change</div>
              <div className="balance-total__row-value cell--up">+5.24%</div>
            </div>
          </div>
        </section>

        <section className="content-card balance-stats">
          <h3 className="card__title">Quick Stats</h3>
          <div className="balance-stats__list">
            <div className="balance-stats__row">
              <span>Estimated BTC</span>
              <b>0.1932 BTC</b>
            </div>
            <div className="balance-stats__row">
              <span>Staking Yield</span>
              <b className="cell--up">+0.045 ETH</b>
            </div>
            <div className="balance-stats__row">
              <span>Trading PNL</span>
              <b className="cell--up">+$124.00</b>
            </div>
          </div>
          <button type="button" className="balance-stats__analytics">
            View Analytics
          </button>
        </section>
      </div>

      {/* -------------------- Deposit + Transactions -------------------- */}
      <div className="balance-page__bottom-grid">
        <section className="content-card balance-deposit">
          <h3 className="balance-deposit__title">
            <DownloadIcon /> Deposit USDT
          </h3>

          <div>
            <div className="balance-deposit__network-label">Network Selector</div>
            <div className="balance-deposit__network">
              <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="balance-deposit__qr">
            <img src={qrUrl} alt={`QR code for ${ADDRESS}`} />
          </div>

          <div className="balance-deposit__address">
            <code>{ADDRESS}</code>
            <button
              type="button"
              className="balance-deposit__copy"
              onClick={handleCopy}
              aria-label="Copy deposit address"
            >
              <CopyIcon />
            </button>
          </div>
          {copied && (
            <div style={{ font: '600 11px/1 var(--app-font)', color: 'var(--app-accent)' }}>
              Address copied to clipboard.
            </div>
          )}

          <div className="balance-deposit__warning">
            <WarningIcon /> Send only <strong>USDT via TRC20</strong> to this address. Sending
            any other coin or using another network may result in permanent loss.
          </div>
        </section>

        <section className="content-card balance-tx">
          <header className="balance-tx__header">
            <h3 className="balance-tx__title">Recent Transactions</h3>
            <a className="balance-tx__csv">Download CSV</a>
          </header>

          <div className="balance-tx__list">
            {visible.map((t, i) => (
              <div key={i} className="balance-tx__row">
                <span
                  className={`balance-tx__type${
                    t.dir === 'out' ? ' balance-tx__type--out' : ''
                  }`}
                >
                  {t.dir === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />} {t.type}
                </span>
                <span className="balance-tx__asset">
                  {t.asset}
                  <span>{t.network}</span>
                </span>
                <span className="balance-tx__amount">{t.amount}</span>
                <span>
                  <span className={`balance-tx__status balance-tx__status--${t.status}`}>
                    {t.status}
                  </span>
                </span>
                <span className="balance-tx__date">{t.date}</span>
                <span className="balance-tx__hash">{t.hash}</span>
              </div>
            ))}
          </div>

          <Pagination
            total={TX.length * 4}
            page={page}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </section>
      </div>
    </div>
  )
}
