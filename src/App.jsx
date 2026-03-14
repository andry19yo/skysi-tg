import React, { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Orders from './pages/Orders.jsx'
import Production from './pages/Production.jsx'
import Finance from './pages/Finance.jsx'

const tg = window.Telegram?.WebApp

const TABS = [
  { id: 'dashboard', label: 'Дашборд', icon: '⬛' },
  { id: 'orders',    label: 'Заказы',   icon: '📦' },
  { id: 'production',label: 'Произв.',  icon: '⚙️' },
  { id: 'finance',   label: 'Финансы',  icon: '💰' },
]

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: tg?.themeParams?.bg_color || '#111111',
    color: tg?.themeParams?.text_color || '#ffffff',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  header: {
    padding: '12px 16px',
    background: tg?.themeParams?.secondary_bg_color || '#1c1c1c',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 2,
    color: tg?.themeParams?.text_color || '#ffffff',
  },
  headerSub: {
    fontSize: 11,
    color: tg?.themeParams?.hint_color || '#888888',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  nav: {
    display: 'flex',
    background: tg?.themeParams?.secondary_bg_color || '#1c1c1c',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  navItem: (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px 8px',
    cursor: 'pointer',
    borderTop: active
      ? `2px solid ${tg?.themeParams?.button_color || '#2196f3'}`
      : '2px solid transparent',
    color: active
      ? (tg?.themeParams?.button_color || '#2196f3')
      : (tg?.themeParams?.hint_color || '#888888'),
    transition: 'color 0.15s',
    userSelect: 'none',
  }),
  navIcon: {
    fontSize: 18,
    lineHeight: 1,
    marginBottom: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: 0.5,
  },
}

const PAGE_MAP = {
  dashboard:  Dashboard,
  orders:     Orders,
  production: Production,
  finance:    Finance,
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const Page = PAGE_MAP[tab]

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>SKYSI</div>
          <div style={styles.headerSub}>управление производством</div>
        </div>
      </div>

      <div style={styles.content}>
        <Page />
      </div>

      <nav style={styles.nav}>
        {TABS.map(t => (
          <div
            key={t.id}
            style={styles.navItem(tab === t.id)}
            onClick={() => setTab(t.id)}
          >
            <span style={styles.navIcon}>{t.icon}</span>
            <span style={styles.navLabel}>{t.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}
