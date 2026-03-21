import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { tg, colors } from './utils'
import BottomNav from './components/BottomNav.jsx'
import AccessDenied from './components/AccessDenied.jsx'
import { Spinner } from './components/Card.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Warehouse from './pages/Warehouse.jsx'
import Documents from './pages/Documents.jsx'
import Finance from './pages/Finance.jsx'
import Orders from './pages/Orders.jsx'

const PAGE_MAP = {
  dashboard: Dashboard,
  warehouse: Warehouse,
  documents: Documents,
  finance: Finance,
  orders: Orders,
}

export default function App() {
  const [authState, setAuthState] = useState('loading') // loading | denied | blocked | ok | dev_prompt
  const [user, setUser] = useState(null)
  const [telegramId, setTelegramId] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [devId, setDevId] = useState('')

  const authenticate = useCallback(async (tgId) => {
    if (!tgId) {
      setAuthState('denied')
      return
    }
    setTelegramId(tgId)
    const { data, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', tgId)
      .single()

    if (error || !data) {
      setAuthState('denied')
      return
    }
    if (!data.is_active) {
      setAuthState('blocked')
      return
    }
    setUser(data)
    setAuthState('ok')
  }, [])

  useEffect(() => {
    const tgUser = tg?.initDataUnsafe?.user
    if (tgUser?.id) {
      authenticate(tgUser.id)
    } else if (!tg) {
      // Dev mode — no Telegram context
      setAuthState('dev_prompt')
    } else {
      setAuthState('denied')
    }
  }, [authenticate])

  // Dev mode login
  const handleDevLogin = (e) => {
    e.preventDefault()
    const id = parseInt(devId, 10)
    if (id) {
      setAuthState('loading')
      authenticate(id)
    }
  }

  if (authState === 'loading') {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: "'IBM Plex Mono', monospace" }}>
        <Spinner />
      </div>
    )
  }

  if (authState === 'dev_prompt') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 32,
        background: colors.bg,
        color: colors.text,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Dev Mode</div>
        <div style={{ fontSize: 12, color: colors.hint, marginBottom: 20 }}>
          Telegram WebApp недоступен. Введите telegram_id:
        </div>
        <form onSubmit={handleDevLogin} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={devId}
            onChange={e => setDevId(e.target.value)}
            placeholder="telegram_id"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.secondaryBg,
              color: colors.text,
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
              width: 180,
            }}
          />
          <button type="submit" style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: colors.button,
            color: colors.buttonText,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Войти
          </button>
        </form>
      </div>
    )
  }

  if (authState === 'denied') {
    return <AccessDenied telegramId={telegramId} />
  }

  if (authState === 'blocked') {
    return <AccessDenied telegramId={telegramId} blocked />
  }

  const Page = PAGE_MAP[tab]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{
        padding: '10px 16px',
        background: colors.secondaryBg,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>SKYSI</div>
          <div style={{ fontSize: 10, color: colors.hint, letterSpacing: 1 }}>управление бизнесом</div>
        </div>
        <div style={{ fontSize: 11, color: colors.hint }}>
          {user?.name || user?.telegram_username || ''}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <Page user={user} />
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
