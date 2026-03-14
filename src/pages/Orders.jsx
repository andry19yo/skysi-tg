import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Card, SectionTitle, Badge, Spinner, ErrorMsg } from '../components/Card.jsx'

const tg = window.Telegram?.WebApp

const STATUS_COLORS = {
  new:        '#2196f3',
  confirmed:  '#9c27b0',
  processing: '#ff9800',
  shipped:    '#03a9f4',
  delivered:  '#4caf50',
  cancelled:  '#f44336',
  default:    '#888888',
}

const PLATFORM_COLORS = {
  WB:   '#9c27b0',
  Ozon: '#2196f3',
  default: '#888',
}

function statusColor(s) {
  return STATUS_COLORS[s] || STATUS_COLORS.default
}

function platformColor(p) {
  if (!p) return PLATFORM_COLORS.default
  if (p.toLowerCase().includes('wb') || p.toLowerCase().includes('wildberries'))
    return PLATFORM_COLORS.WB
  if (p.toLowerCase().includes('ozon'))
    return PLATFORM_COLORS.Ozon
  return PLATFORM_COLORS.default
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ru-RU')
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('documents')
          .select('id, number, date, status, platform, total_amount, counterparty')
          .in('type', ['order', 'sale'])
          .order('date', { ascending: false })
          .limit(50)

        if (filter !== 'all') {
          query = query.eq('platform', filter)
        }

        const { data, error: err } = await query
        if (err) throw err
        setOrders(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter])

  const filters = [
    { id: 'all', label: 'Все' },
    { id: 'WB',   label: 'WB' },
    { id: 'Ozon', label: 'Ozon' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              fontWeight: 500,
              background: filter === f.id
                ? (tg?.themeParams?.button_color || '#2196f3')
                : 'rgba(255,255,255,0.08)',
              color: filter === f.id
                ? (tg?.themeParams?.button_text_color || '#fff')
                : (tg?.themeParams?.text_color || '#fff'),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          <SectionTitle>{orders.length} заказов</SectionTitle>
          {orders.length === 0 && (
            <Card><span style={{ color: '#888', fontSize: 13 }}>Заказы не найдены</span></Card>
          )}
          {orders.map(o => (
            <Card key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>№{o.number || o.id}</span>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{fmtDate(o.date)}</span>
                </div>
                <Badge color={statusColor(o.status)}>{o.status || '—'}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {o.platform && (
                    <Badge color={platformColor(o.platform)}>{o.platform}</Badge>
                  )}
                  {o.counterparty && (
                    <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{o.counterparty}</span>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {fmt(o.total_amount)} ₽
                </span>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
