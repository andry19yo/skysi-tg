import React from 'react'
import { colors } from '../utils'

export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: colors.secondaryBg,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 8,
      border: `1px solid ${colors.border}`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, color, sub, accent }) {
  const accentColor = accent || color || colors.button
  return (
    <div style={{
      background: colors.secondaryBg,
      border: `1px solid ${accentColor}22`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 8,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, color: colors.hint,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || colors.text, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: colors.hint, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 8, marginTop: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
        color: colors.hint, textTransform: 'uppercase',
      }}>
        {children}
      </div>
      {right && right}
    </div>
  )
}

// Keep old StatCard as alias for MetricCard
export function StatCard({ label, value, color, sub }) {
  return <MetricCard label={label} value={value} color={color} sub={sub} />
}

export function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: colors.hint, fontSize: 12 }}>
      загрузка...
    </div>
  )
}

export function ErrorMsg({ msg }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: '#f4433615', border: '1px solid #f4433633',
      color: '#f44336', fontSize: 12, marginTop: 8, lineHeight: 1.5,
    }}>
      {msg}
    </div>
  )
}

export function EmptyState({ text }) {
  return (
    <div style={{
      textAlign: 'center', padding: '32px 20px',
      color: colors.hint, fontSize: 12,
    }}>
      {text || 'Нет данных'}
    </div>
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
        width: '100%', padding: '8px 12px', borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.secondaryBg, color: colors.text,
        fontSize: 12, outline: 'none', marginBottom: 8, fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    />
  )
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, overflowX: 'auto' }}>
      {options.map(o => {
        const active = value === o.value
        return (
          <div
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '5px 10px', borderRadius: 6,
              fontSize: 11, fontWeight: active ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: active ? colors.button : 'transparent',
              color: active ? colors.buttonText : colors.hint,
              border: `1px solid ${active ? colors.button : colors.border}`,
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {o.label}
          </div>
        )
      })}
    </div>
  )
}

export function TabBar({ tabs, value, onChange }) {
  return (
    <div style={{
      display: 'flex', borderBottom: `1px solid ${colors.border}`,
      marginBottom: 12, gap: 0,
    }}>
      {tabs.map(t => {
        const active = value === t.value
        return (
          <div
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              padding: '8px 16px', cursor: 'pointer',
              fontSize: 12, fontWeight: active ? 700 : 400,
              color: active ? (t.color || colors.button) : colors.hint,
              borderBottom: active ? `2px solid ${t.color || colors.button}` : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </div>
        )
      })}
    </div>
  )
}
