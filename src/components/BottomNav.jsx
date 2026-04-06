import React, { useState } from 'react'
import { colors } from '../utils'

const MAIN_TABS = [
  { id: 'dashboard', label: 'Главная',   icon: '🏠' },
  { id: 'documents', label: 'Документы', icon: '📄' },
  { id: 'finance',   label: 'Финансы',   icon: '💰' },
  { id: 'contractors', label: 'Контраг.', icon: '👥' },
  { id: 'more',      label: 'Ещё',       icon: '⋯' },
]

const MORE_ITEMS = [
  { id: 'warehouse', label: 'Склад',         icon: '📦' },
  { id: 'reports',   label: 'Отчёты',        icon: '📊' },
  { id: 'orders',    label: 'Заказы МП',     icon: '🛒' },
]

export default function BottomNav({ active, onChange }) {
  const [showMore, setShowMore] = useState(false)

  const handleTab = (id) => {
    if (id === 'more') {
      setShowMore(prev => !prev)
    } else {
      setShowMore(false)
      onChange(id)
    }
  }

  // Highlight "more" tab if current page is in MORE_ITEMS
  const isMoreActive = MORE_ITEMS.some(m => m.id === active)

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <>
          <div
            onClick={() => setShowMore(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 98,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 56, left: 8, right: 8, zIndex: 99,
            background: colors.secondaryBg,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: '4px 0',
          }}>
            {MORE_ITEMS.map(m => (
              <div
                key={m.id}
                onClick={() => handleTab(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: active === m.id ? colors.button : colors.text,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav style={{
        display: 'flex',
        background: colors.secondaryBg,
        borderTop: `1px solid ${colors.border}`,
        position: 'sticky',
        bottom: 0,
        zIndex: 100,
      }}>
        {MAIN_TABS.map(t => {
          const isActive = t.id === 'more' ? (isMoreActive || showMore) : active === t.id
          return (
            <div
              key={t.id}
              onClick={() => handleTab(t.id)}
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
    </>
  )
}
