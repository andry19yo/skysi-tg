import React from 'react'

const tg = window.Telegram?.WebApp

export function Card({ children, style }) {
  return (
    <div style={{
      background: tg?.themeParams?.secondary_bg_color || '#1c1c1c',
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 12,
      border: '1px solid rgba(255,255,255,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 2,
      color: tg?.themeParams?.hint_color || '#888888',
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 4,
    }}>
      {children}
    </div>
  )
}

export function Badge({ color = '#888', children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      background: color + '22',
      color,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.5,
    }}>
      {children}
    </span>
  )
}

export function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>
      загрузка...
    </div>
  )
}

export function ErrorMsg({ msg }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: '#ff000020',
      color: '#ff6b6b',
      fontSize: 13,
      marginTop: 8,
    }}>
      {msg}
    </div>
  )
}
