import React from 'react'
import { colors } from '../utils'

const TABS = [
  { id: 'dashboard', label: 'Главная',   icon: '🏠' },
  { id: 'warehouse', label: 'Склад',     icon: '📦' },
  { id: 'documents', label: 'Документы', icon: '📄' },
  { id: 'finance',   label: 'Финансы',   icon: '💰' },
  { id: 'orders',    label: 'Заказы МП', icon: '🛒' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav style={{
      display: 'flex',
      background: colors.secondaryBg,
      borderTop: `1px solid ${colors.border}`,
      position: 'sticky',
      bottom: 0,
      zIndex: 100,
    }}>
      {TABS.map(t => {
        const isActive = active === t.id
        return (
          <div
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 2px 6px',
              cursor: 'pointer',
              borderTop: isActive
                ? `2px solid ${colors.button}`
                : '2px solid transparent',
              color: isActive ? colors.button : colors.hint,
              transition: 'color 0.15s',
              userSelect: 'none',
              minHeight: 52,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 0.3 }}>{t.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
