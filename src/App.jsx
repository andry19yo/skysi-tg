import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { tg, colors } from './utils'
import BottomNav from './components/BottomNav.jsx'
import AccessDenied from './components/AccessDenied.jsx'
import { Spinner } from './components/Card.jsx'
import { ToastContainer } from './components/Toast.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Warehouse from './pages/Warehouse.jsx'
import Documents from './pages/Documents.jsx'
import Finance from './pages/Finance.jsx'
import MarketplaceReports from './pages/MarketplaceReports.jsx'
import Contractors from './pages/Contractors.jsx'
import Reports from './pages/Reports.jsx'

const CACHE_KEY = 'skysi_tg_user'
const TABS = ['dashboard', 'warehouse', 'documents', 'finance', 'mp_reports', 'contractors', 'reports']
const PAGE_MAP = {
  dashboard: Dashboard,
  warehouse: Warehouse,
  documents: Documents,
  finance: Finance,
  mp_reports: MarketplaceReports,
  contractors: Contractors,
  reports: Reports,
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
  } else {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

export default function App() {
  // authState: loading | login | checking | blocked | ok | dev_prompt
  const [authState, setAuthState] = useState('loading')
  const [user, setUser] = useState(null)
  const [telegramId, setTelegramId] = useState(null)
  const [tab, setTab] = useState('dashboard')
  // Lazy tabs: track which tabs have been visited (mounted once, kept in DOM)
  const [visitedTabs, setVisitedTabs] = useState(new Set(['dashboard']))
  const [devId, setDevId] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [copied, setCopied] = useState(false)

  // authenticate: check telegram_id in DB
  // silent=true: background re-check (don't change state on success)
  const authenticate = useCallback(async (tgId, silent = false) => {
    if (!tgId) {
      if (!silent) setAuthState('login')
      return
    }
    if (!silent) setAuthState('checking')

    const { data, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', tgId)
      .single()

    if (error || !data) {
      if (!silent) {
        setLoginError('Нет доступа. Отправьте ваш ID администратору @andry054')
        setAuthState('login')
      }
      return
    }

    if (!data.is_active) {
      localStorage.removeItem(CACHE_KEY)
      setAuthState('blocked')
      return
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      telegram_id: data.telegram_id,
      role: data.role,
      name: data.name,
      telegram_username: data.telegram_username,
    }))
    setUser(data)
    if (!silent) setAuthState('ok')
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw)
        setUser(cached)
        setTelegramId(cached.telegram_id)
        setAuthState('ok')
        authenticate(cached.telegram_id, true)
        return
      }
    } catch (_) {}

    // tg?.initData is only populated inside real Telegram WebApp
    const isRealTelegram = tg && tg.initData && tg.initData.length > 0
    const tgUser = tg?.initDataUnsafe?.user

    if (tgUser?.id) {
      // Inside Telegram with user data — auto-login
      setTelegramId(tgUser.id)
      authenticate(tgUser.id)
    } else if (!isRealTelegram) {
      // Browser (not Telegram) — dev mode
      setAuthState('dev_prompt')
    } else {
      // Telegram but no user (edge case)
      setAuthState('login')
    }
  }, [authenticate])

  const handleLogin = () => {
    setLoginError(null)
    authenticate(telegramId)
  }

  const handleDevLogin = (e) => {
    e.preventDefault()
    const id = parseInt(devId, 10)
    if (id) {
      setTelegramId(id)
      setLoginError(null)
      authenticate(id)
    }
  }

  const handleCopyId = () => {
    if (!telegramId) return
    copyText(String(telegramId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')
  }

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setVisitedTabs(prev => new Set([...prev, newTab]))
  }

  // ── Styles ──────────────────────────────────────────────────
  const pageWrap = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', padding: 32,
    background: colors.bg, color: colors.text,
    fontFamily: "'IBM Plex Mono', monospace",
  }

  const btnPrimary = {
    width: '100%', maxWidth: 280, padding: '14px',
    borderRadius: 12, border: 'none',
    background: colors.button, color: colors.buttonText,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  }

  // ── Loading ──────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: "'IBM Plex Mono', monospace" }}>
        <ToastContainer />
        <Spinner />
      </div>
    )
  }

  // ── Dev mode (no Telegram context) ──────────────────────────
  if (authState === 'dev_prompt') {
    return (
      <div style={pageWrap}>
        <ToastContainer />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>SKYSI</div>
        <div style={{ fontSize: 11, color: colors.hint, marginBottom: 32, letterSpacing: 1 }}>
          Dev Mode
        </div>
        <div style={{ fontSize: 12, color: colors.hint, marginBottom: 16, textAlign: 'center' }}>
          Telegram WebApp недоступен. Введите telegram_id:
        </div>
        <form onSubmit={handleDevLogin} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280 }}>
          <input
            type="text"
            value={devId}
            onChange={e => setDevId(e.target.value)}
            placeholder="telegram_id"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.secondaryBg, color: colors.text,
              fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button type="submit" style={{
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: colors.button, color: colors.buttonText,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Войти
          </button>
        </form>
        {loginError && (
          <div style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 10,
            background: '#f4433622', fontSize: 12, color: '#f44336',
            textAlign: 'center', maxWidth: 280, lineHeight: 1.6,
          }}>
            {loginError}
          </div>
        )}
      </div>
    )
  }

  // ── Login screen (Telegram context present) ──────────────────
  if (authState === 'login' || authState === 'checking') {
    const isChecking = authState === 'checking'
    return (
      <div style={pageWrap}>
        <ToastContainer />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>SKYSI</div>
        <div style={{ fontSize: 11, color: colors.hint, marginBottom: 40, letterSpacing: 1 }}>
          управление бизнесом
        </div>

        {telegramId ? (
          <>
            <div style={{ fontSize: 11, color: colors.hint, marginBottom: 8, letterSpacing: 1 }}>
              ВАШ TELEGRAM ID
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, letterSpacing: 3,
              color: colors.text, marginBottom: 12,
            }}>
              {telegramId}
            </div>
            <button onClick={handleCopyId} style={{
              padding: '8px 20px', borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: copied ? '#4caf50' : colors.hint,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              marginBottom: 40, transition: 'color 0.2s',
            }}>
              {copied ? '✓ Скопировано' : 'Скопировать ID'}
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: colors.hint, marginBottom: 40, textAlign: 'center' }}>
            ID не определён
          </div>
        )}

        {loginError && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#f4433622', fontSize: 12, color: '#f44336',
            textAlign: 'center', maxWidth: 280, lineHeight: 1.6,
          }}>
            {loginError}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isChecking || !telegramId}
          style={{ ...btnPrimary, opacity: (isChecking || !telegramId) ? 0.6 : 1 }}
        >
          {isChecking ? 'Проверка...' : 'Войти'}
        </button>
      </div>
    )
  }

  // ── Blocked ──────────────────────────────────────────────────
  if (authState === 'blocked') {
    return <AccessDenied telegramId={telegramId} blocked />
  }

  // ── App (authState === 'ok') ──────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: colors.bg, color: colors.text,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <ToastContainer />

      {/* Header */}
      <div style={{
        padding: '10px 16px',
        background: colors.secondaryBg,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>SKYSI</div>
          <div style={{ fontSize: 10, color: colors.hint, letterSpacing: 1 }}>управление бизнесом</div>
        </div>
        <div style={{ fontSize: 11, color: colors.hint }}>
          {user?.name || user?.telegram_username || ''}
        </div>
      </div>

      {/* Content — lazy: render tab only after first visit, keep in DOM */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {TABS.map(t => {
          if (!visitedTabs.has(t)) return null
          const Page = PAGE_MAP[t]
          return (
            <div key={t} style={{ display: t === tab ? 'block' : 'none' }}>
              <Page user={user} />
            </div>
          )
        })}
      </div>

      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  )
}
