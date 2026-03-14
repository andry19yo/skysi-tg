import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Card, SectionTitle, Badge, Spinner, ErrorMsg } from '../components/Card.jsx'

const tg = window.Telegram?.WebApp

const STATUS_COLORS = {
  planned:    '#9c27b0',
  in_progress:'#ff9800',
  paused:     '#607d8b',
  completed:  '#4caf50',
  cancelled:  '#f44336',
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ru-RU')
}

function Progress({ value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color = pct >= 90 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#2196f3'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
        <span>выполнено</span>
        <span>{fmt(value)} / {fmt(max)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: pct + '%',
          background: color,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

export default function Production() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('production_orders')
          .select('id, order_num, product_name, qty, status, started_date, deadline, responsible')
          .in('status', ['new', 'in_progress', 'paused'])
          .order('started_date', { ascending: true })
          .limit(30)

        if (err) throw err
        setBatches(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const inProgress = batches.filter(b => b.status === 'in_progress')
  const planned    = batches.filter(b => b.status === 'new')
  const paused     = batches.filter(b => b.status === 'paused')

  const groups = [
    { label: 'В работе', items: inProgress },
    { label: 'Запланировано', items: planned },
    { label: 'На паузе', items: paused },
  ]

  return (
    <div>
      {batches.length === 0 && (
        <Card><span style={{ color: '#888', fontSize: 13 }}>Активных партий нет</span></Card>
      )}
      {groups.map(g => g.items.length > 0 && (
        <div key={g.label}>
          <SectionTitle>{g.label} · {g.items.length}</SectionTitle>
          {g.items.map(b => (
            <Card key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.product_name || 'Без названия'}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    №{b.order_num} · {fmtDate(b.started_date)}{b.deadline ? ` — ${fmtDate(b.deadline)}` : ''}
                  </div>
                </div>
                <Badge color={STATUS_COLORS[b.status] || '#888'}>
                  {b.status}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {fmt(b.qty)} шт{b.responsible ? ` · ${b.responsible}` : ''}
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
