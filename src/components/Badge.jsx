import React from 'react'

export function Badge({ color = '#888', children, style }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      background: color + '22',
      color,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.5,
      ...style,
    }}>
      {children}
    </span>
  )
}
