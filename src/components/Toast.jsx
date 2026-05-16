import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './Toast.css'

export default function Toast({ message, kind = 'success', duration = 3500, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return undefined
    const showId = requestAnimationFrame(() => setVisible(true))
    const hideId = setTimeout(() => setVisible(false), duration)
    const closeId = setTimeout(() => onClose?.(), duration + 350)
    return () => {
      cancelAnimationFrame(showId)
      clearTimeout(hideId)
      clearTimeout(closeId)
    }
  }, [message, duration, onClose])

  if (!message) return null

  return createPortal(
    <div className={`toast-layer ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite">
      <div className={`toast toast--${kind}`}>
        <span className="toast__icon" aria-hidden="true">
          {kind === 'success' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="toast__message">{message}</span>
      </div>
    </div>,
    document.body,
  )
}
