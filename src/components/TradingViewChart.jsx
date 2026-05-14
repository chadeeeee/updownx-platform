import { useEffect, useRef } from 'react'

/**
 * TradingViewChart — embeds TradingView's "Advanced Chart" widget.
 *
 * Important: TradingView's widget script mutates the inline style of
 * its own `.tradingview-widget-container` element (it sets
 * height: 100%; width: 100% on it). If we put our explicit pixel
 * height directly on that element it gets overwritten and the chart
 * collapses to whatever the parent provides (which is `auto` => 0
 * inside a flex column, so it ends up tiny).
 *
 * The fix: wrap the widget in our own `.tv-chart-wrapper` div with the
 * fixed pixel height. The widget container then fills 100% of the
 * wrapper, and the iframe fills 100% of the widget container.
 */
export default function TradingViewChart({
  symbol = 'BINANCE:BTCUSDT',
  interval = '5',
  theme = 'dark',
  height = 620,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      toolbar_bg: '#0b0f14',
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: true,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      details: false,
      hotlist: false,
      calendar: false,
      withdateranges: true,
      backgroundColor: '#0b0f14',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      support_host: 'https://www.tradingview.com',
    })

    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [symbol, interval, theme])

  return (
    <div
      className="tv-chart-wrapper"
      style={{
        height: `${height}px`,
        minHeight: `${height}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: '100%', width: '100%' }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  )
}
