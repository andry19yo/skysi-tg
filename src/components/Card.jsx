import React from 'react'
import { colors } from '../utils'

export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: colors.secondaryBg,
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 10,
      border: `1px solid ${colors.border}`,
      cursor: onClick ? 'pointer' : 'default',
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
      color: colors.hint,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 4,
    }}>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: colors.hint, fontSize: 13 }}>
      загрузка...
    </div>
  )
}

export function ErrorMsg({ msg }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: '#ff000020',
      color: '#ff6b6b',
      fontSize: 13,
      marginTop: 8,
    }}>
      {msg}
    </div>
  )
}

export function EmptyState({ text }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      color: colors.hint,
      fontSize: 13,
    }}>
      {text || 'Нет данных'}
    </div>
  )
}

export function StatCard({ label, value, color, sub }) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: colors.hint, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || colors.text }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>{sub}</div>}
    </Card>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Поиск...'}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: colors.secondaryBg,
        color: colors.text,
        fontSize: 14,
        outline: 'none',
        marginBottom: 10,
        fontFamily: 'inherit',
      }}
    />
  )
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, overflowX: 'auto' }}>
      {options.map(o => (
        <div
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: value === o.value ? colors.button : colors.secondaryBg,
            color: value === o.value ? colors.buttonText : colors.hint,
            border: `1px solid ${value === o.value ? colors.button : colors.border}`,
            fontFamily: 'inherit',
          }}
        >
          {o.label}
        </div>
      ))}
    </div>
  )
}
