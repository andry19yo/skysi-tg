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

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: salesData } = await supabase
        .from('documents')
        .select('total_amount')
        .in('doc_type', ['torg12', 'отгрузка'])
        .eq('status', 'posted')
        .eq('accounting_type', 'official')
        .gte('doc_date', startOfMonth)

      setSales((salesData || []).reduce((s, d) => s + Number(d.total_amount || 0), 0))

      const { data: accounts } = await supabase
        .from('financial_accounts')
        .select('balance')
        .eq('accounting_type', 'official')

      setBalance((accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0))

      const { data: settlements } = await supabase
        .from('settlement_register')
        .select('amount')

      let deb = 0, cred = 0
      for (const r of (settlements || [])) {
        const amt = Number(r.amount || 0)
        if (amt > 0) deb += amt
        else cred += Math.abs(amt)
      }
      setDebit(deb)
      setCredit(cred)

      const { data: products } = await supabase
        .from('products')
        .select('id, name, qty, unit')
        .lt('qty', 20)
        .order('qty', { ascending: true })
        .limit(5)

      setRedZone(products || [])

      const { data: docs } = await supabase
        .from('documents')
        .select('id, doc_number, doc_type, doc_date, total_amount, status, contractor_id, contractors(name)')
        .eq('status', 'posted')
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
      <SectionTitle>Продажи за месяц</SectionTitle>
      <StatCard label="Выручка (офиц.)" value={fmt(sales) + ' ₽'} color="#4caf50" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="Баланс (офиц.)" value={fmt(balance) + ' ₽'} color={balance >= 0 ? '#4caf50' : '#f44336'} />
        <StatCard label="Дебиторка" value={fmt(debit) + ' ₽'} color="#ff9800" />
      </div>
      <StatCard label="Кредиторка" value={fmt(credit) + ' ₽'} color="#f44336" />

      {redZone.length > 0 && (
        <>
          <SectionTitle>Остатки в красной зоне</SectionTitle>
          {redZone.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f44336' }}>
                  {p.qty} {p.unit || 'шт'}
                </span>
              </div>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Последние документы</SectionTitle>
      {recentDocs.length === 0 ? (
        <EmptyState text="Нет проведённых документов" />
      ) : (
        recentDocs.map(d => (
          <Card key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <Badge color={DOC_TYPE_COLORS[d.doc_type] || '#888'}>
                  {DOC_TYPE_MAP[d.doc_type] || d.doc_type}
                </Badge>
                <span style={{ fontSize: 12, marginLeft: 6 }}>#{d.doc_number}</span>
              </div>
              <span style={{ fontSize: 12, color: colors.hint }}>{fmtDate(d.doc_date)}</span>
            </div>
            <div style={{ fontSize: 12, color: colors.hint, marginTop: 2 }}>
              {d.contractors?.name || '—'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {fmt(d.total_amount)} ₽
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
