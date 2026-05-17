import { useCallback, useEffect, useState } from 'react'

const KEY = (uid) => `updownx.avatar.${uid ?? 'guest'}`
const EVENT = 'updownx:avatar'

function read(uid) {
  try {
    return localStorage.getItem(KEY(uid)) || null
  } catch {
    return null
  }
}

export default function useAvatar(userId) {
  const [src, setSrc] = useState(() => read(userId))

  useEffect(() => {
    setSrc(read(userId))
    const refresh = (e) => {
      if (e?.detail?.userId != null && e.detail.userId !== userId) return
      setSrc(read(userId))
    }
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [userId])

  const set = useCallback(
    (dataUrl) => {
      try {
        if (dataUrl) localStorage.setItem(KEY(userId), dataUrl)
        else localStorage.removeItem(KEY(userId))
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId } }))
    },
    [userId],
  )

  return [src, set]
}
