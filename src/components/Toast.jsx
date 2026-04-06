import React, { useState, useEffect, useCallback, useRef } from 'react'

const TOAST_DURATION = { error: 5000, warn: 4000, success: 2500, info: 3000 }
const TOAST_COLORS = {
  error:   { bg: '#f4433633', color: '#f44336', border: '#f4433644' },
  warn:    { bg: '#ff980033', color: '#ff9800', border: '#ff980044' },
  success: { bg: '#4caf5033', color: '#4caf50', border: '#4caf5044' },
  info:    { bg: '#2196f333', color: '#2196f3', border: '#2196f344' },
}

let _addToast = () => {}

export const toast = {
  error:   (msg) => _addToast('error', msg),
  warn:    (msg) => _addToast('warn', msg),
  success: (msg) => _addToast('success', msg),
  info:    (msg) => _addToast('info', msg),
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    _addToast = (type, msg) => {
      const id = ++idRef.current
      setToasts(prev => [...prev.slice(-4), { id, type, msg }])
      setTimeout(() => remove(id), TOAST_DURATION[type] || 3000)
    }
    return () => { _addToast = () => {} }
  }, [remove])

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', top: 8, left: 8, right: 8, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 6,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = TOAST_COLORS[t.type] || TOAST_COLORS.info
        return (
          <div key={t.id} onClick={() => remove(t.id)} style={{
            padding: '10px 14px', borderRadius: 10,
            background: c.bg, color: c.color,
            border: `1px solid ${c.border}`,
            fontSize: 12, lineHeight: 1.5,
            pointerEvents: 'auto', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            animation: 'toast-in 0.2s ease-out',
          }}>
            {t.msg}
          </div>
        )
      })}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
