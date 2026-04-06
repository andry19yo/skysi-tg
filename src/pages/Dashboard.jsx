import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, DOC_TYPE_MAP, DOC_TYPE_COLORS, colors } from '../utils'
import { Card, SectionTitle, StatCard, Spinner, ErrorMsg, EmptyState } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sales, setSales] = useState(0)
  const [balance, setBalance] = useState(0)
  const [debit, setDebit] = useState(0)
  const [credit, setCredit] = useState(0)
  const [redZone, setRedZone] = useState([])
  const [recentDocs, setRecentDocs] = useState([])
  const [draftsCount, setDraftsCount] = useState(0)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Sales: torg12 + ttn, excluding MP (contractor_id 2,8)
      const { data: salesData } = await supabase
        .from('documents')
        .select('amount, contractor_id')
        .in('doc_type', ['torg12', 'ttn'])
        .eq('status', 'posted')
        .gte('doc_date', startOfMonth)

      const directSales = (salesData || []).filter(d => d.contractor_id !== 2 && d.contractor_id !== 8)
      setSales(directSales.reduce((s, d) => s + Number(d.amount || 0), 0))

      // Official accounts balance
      const { data: accounts } = await supabase
        .from('financial_accounts')
        .select('balance, include_in_balance')
        .eq('is_active', true)

      setBalance((accounts || []).filter(a => a.include_in_balance !== false).reduce((s, a) => s + Number(a.balance || 0), 0))

      // Debts from contractors.balance
      const { data: contractors } = await supabase
        .from('contractors')
        .select('balance')

      let deb = 0, cred = 0
      for (const c of (contractors || [])) {
        const bal = Number(c.balance || 0)
        if (bal > 0) deb += bal
        else if (bal < 0) cred += Math.abs(bal)
      }
      setDebit(deb)
      setCredit(cred)

      // Red zone products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, qty, unit')
        .lt('qty', 20)
        .order('qty', { ascending: true })
        .limit(5)
      setRedZone(products || [])

      // Drafts count
      const { count } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
      setDraftsCount(count || 0)

      // Recent docs
      const { data: docs } = await supabase
        .from('documents')
        .select('id, num, doc_type, doc_date, amount, status, contractor_id, contractors(name)')
        .order('doc_date', { ascending: false })
        .limit(5)
      setRecentDocs(docs || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <SectionTitle>Продажи за месяц</SectionTitle>
        <div onClick={load} style={{ fontSize: 11, color: colors.button, cursor: 'pointer', padding: '4px 8px' }}>
          Обновить
        </div>
      </div>

      <StatCard label="Выручка (прямые продажи)" value={fmt(sales) + ' ₽'} color="#4caf50" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="Баланс счетов" value={fmt(balance) + ' ₽'} color={balance >= 0 ? '#4caf50' : '#f44336'} />
        <StatCard label="Нам должны" value={fmt(debit) + ' ₽'} color="#ff9800" />
      </div>
      <StatCard label="Мы должны" value={fmt(credit) + ' ₽'} color="#f44336" />

      {draftsCount > 0 && (
        <Card style={{ background: '#ff980015', borderColor: '#ff980033' }}>
          <div style={{ fontSize: 12, color: '#ff9800' }}>
            Непроведённых черновиков: <b>{draftsCount}</b>
          </div>
        </Card>
      )}

      {redZone.length > 0 && (
        <>
          <SectionTitle>Остатки в красной зоне</SectionTitle>
          {redZone.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: Number(p.qty) <= 0 ? '#f44336' : '#ff9800' }}>
                  {p.qty} {p.unit || 'шт'}
                </span>
              </div>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Последние документы</SectionTitle>
      {recentDocs.length === 0 ? (
        <EmptyState text="Нет документов" />
      ) : (
        recentDocs.map(d => (
          <Card key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge color={DOC_TYPE_COLORS[d.doc_type] || '#888'}>
                  {DOC_TYPE_MAP[d.doc_type] || d.doc_type}
                </Badge>
                <span style={{ fontSize: 12 }}>#{d.num}</span>
              </div>
              <span style={{ fontSize: 11, color: colors.hint }}>{fmtDate(d.doc_date)}</span>
            </div>
            <div style={{ fontSize: 12, color: colors.hint, marginTop: 2 }}>
              {d.contractors?.name || '—'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {fmt(d.amount)} ₽
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
