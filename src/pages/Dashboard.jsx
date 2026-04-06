import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, DOC_TYPE_MAP, DOC_TYPE_COLORS, colors } from '../utils'
import { Card, MetricCard, SectionTitle, Spinner, ErrorMsg, EmptyState } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Sales: torg12 + ttn, excluding MP (contractor_id 2,8)
      const [salesRes, accRes, contrRes, prodRes, draftsRes, docsRes] = await Promise.all([
        supabase.from('documents').select('amount, contractor_id')
          .in('doc_type', ['torg12', 'ttn']).eq('status', 'posted').gte('doc_date', startOfMonth),
        supabase.from('financial_accounts').select('balance, include_in_balance').eq('is_active', true),
        supabase.from('contractors').select('balance'),
        supabase.from('products').select('id, name, qty, unit').lt('qty', 20).order('qty', { ascending: true }).limit(5),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('documents').select('id, num, doc_type, doc_date, amount, status, contractor_id, contractors(name)')
          .order('doc_date', { ascending: false }).limit(5),
      ])

      const directSales = (salesRes.data || []).filter(d => d.contractor_id !== 2 && d.contractor_id !== 8)
      const sales = directSales.reduce((s, d) => s + Number(d.amount || 0), 0)
      const balance = (accRes.data || []).filter(a => a.include_in_balance !== false)
        .reduce((s, a) => s + Number(a.balance || 0), 0)

      let debit = 0, credit = 0
      for (const c of (contrRes.data || [])) {
        const bal = Number(c.balance || 0)
        if (bal > 0) debit += bal
        else if (bal < 0) credit += Math.abs(bal)
      }

      setData({
        sales, balance, debit, credit,
        redZone: prodRes.data || [],
        draftsCount: draftsRes.count || 0,
        recentDocs: docsRes.data || [],
      })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />
  if (!data) return null

  return (
    <div>
      <SectionTitle right={
        <div onClick={load} style={{ fontSize: 10, color: colors.button, cursor: 'pointer' }}>Обновить</div>
      }>Продажи за месяц</SectionTitle>

      <MetricCard label="Выручка (прямые продажи)" value={fmt(data.sales) + ' ₽'} accent="#10B981" color="#10B981" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Баланс счетов" value={fmt(data.balance) + ' ₽'}
          accent={data.balance >= 0 ? '#10B981' : '#EF4444'}
          color={data.balance >= 0 ? '#10B981' : '#EF4444'} />
        <MetricCard label="Нам должны" value={fmt(data.debit) + ' ₽'} accent="#ff9800" color="#ff9800" />
      </div>

      <MetricCard label="Мы должны" value={fmt(data.credit) + ' ₽'} accent="#EF4444" color="#EF4444" />

      {data.draftsCount > 0 && (
        <Card style={{ background: '#ff980010', borderColor: '#ff980033' }}>
          <div style={{ fontSize: 11, color: '#ff9800' }}>
            Непроведённых черновиков: <b>{data.draftsCount}</b>
          </div>
        </Card>
      )}

      {data.redZone.length > 0 && (
        <>
          <SectionTitle>Остатки в красной зоне</SectionTitle>
          {data.redZone.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: Number(p.qty) <= 0 ? '#EF4444' : '#ff9800' }}>
                  {p.qty} {p.unit || 'шт'}
                </span>
              </div>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Последние документы</SectionTitle>
      {data.recentDocs.length === 0 ? (
        <EmptyState text="Нет документов" />
      ) : (
        data.recentDocs.map(d => (
          <Card key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge color={DOC_TYPE_COLORS[d.doc_type] || '#888'}>
                  {DOC_TYPE_MAP[d.doc_type] || d.doc_type}
                </Badge>
                <span style={{ fontSize: 11 }}>#{d.num}</span>
              </div>
              <span style={{ fontSize: 10, color: colors.hint }}>{fmtDate(d.doc_date)}</span>
            </div>
            <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>
              {d.contractors?.name || '—'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>
              {fmt(d.amount)} ₽
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
