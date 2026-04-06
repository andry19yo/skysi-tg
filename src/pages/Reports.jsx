import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, colors } from '../utils'
import { Card, MetricCard, SectionTitle, TabBar, FilterChips, Spinner, EmptyState } from '../components/Card.jsx'

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
]

function getPeriodDates(period) {
  const now = new Date()
  let from
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3
    from = new Date(now.getFullYear(), q, 1)
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1)
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

export default function Reports() {
  const [tab, setTab] = useState('sales')
  const [period, setPeriod] = useState('month')

  const tabs = [
    { value: 'sales', label: 'Продажи' },
    { value: 'stock', label: 'Остатки' },
    { value: 'debts', label: 'Долги' },
  ]

  return (
    <div>
      <SectionTitle>Отчёты</SectionTitle>
      <TabBar tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'sales' && <SalesReport period={period} onPeriodChange={setPeriod} />}
      {tab === 'stock' && <StockReport />}
      {tab === 'debts' && <DebtsReport />}
    </div>
  )
}

function SalesReport({ period, onPeriodChange }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { from, to } = getPeriodDates(period)

        // Revenue from torg12 + ttn (excluding MP contractor_id 2, 8)
        const { data: docs } = await supabase
          .from('documents')
          .select('id, amount, contractor_id')
          .in('doc_type', ['torg12', 'ttn'])
          .eq('status', 'posted')
          .gte('doc_date', from)
          .lte('doc_date', to)

        const directDocs = (docs || []).filter(d => d.contractor_id !== 2 && d.contractor_id !== 8)
        const revenue = directDocs.reduce((s, d) => s + Number(d.amount || 0), 0)
        const docCount = directDocs.length

        // All docs count for period
        const { data: allDocs } = await supabase
          .from('documents')
          .select('id')
          .eq('status', 'posted')
          .gte('doc_date', from)
          .lte('doc_date', to)

        // Top contractors
        const byContractor = {}
        for (const d of directDocs) {
          const cid = d.contractor_id || 0
          if (!byContractor[cid]) byContractor[cid] = { total: 0, count: 0 }
          byContractor[cid].total += Number(d.amount || 0)
          byContractor[cid].count++
        }

        const cids = Object.keys(byContractor).filter(id => id !== '0').map(Number)
        let contractorNames = {}
        if (cids.length) {
          const { data: cData } = await supabase.from('contractors').select('id, name').in('id', cids)
          for (const c of (cData || [])) contractorNames[c.id] = c.name
        }

        const topContractors = Object.entries(byContractor)
          .map(([cid, v]) => ({ name: contractorNames[cid] || 'Без контрагента', ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)

        setData({ revenue, docCount, allDocsCount: (allDocs || []).length, topContractors })
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [period])

  if (loading) return <Spinner />

  return (
    <div>
      <FilterChips options={PERIOD_OPTIONS} value={period} onChange={onPeriodChange} />

      <MetricCard label="Выручка (прямые продажи)" value={fmt(data?.revenue || 0) + ' ₽'} accent="#10B981" color="#10B981" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Отгрузок" value={String(data?.docCount || 0)} color={colors.text} />
        <MetricCard label="Всего документов" value={String(data?.allDocsCount || 0)} color={colors.text} />
      </div>

      {data?.topContractors?.length > 0 && (
        <>
          <SectionTitle>Топ покупатели</SectionTitle>
          {data.topContractors.map((c, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: colors.hint }}>{c.count} док.</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>{fmt(c.total)} ₽</div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

function StockReport() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('products').select('id, name, qty, cost, unit, category').order('name')
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const totalValue = products.reduce((s, p) => s + Number(p.qty || 0) * Number(p.cost || 0), 0)
  const inStock = products.filter(p => Number(p.qty) > 0).length
  const lowStock = products.filter(p => Number(p.qty) > 0 && Number(p.qty) < 10)
  const outOfStock = products.filter(p => Number(p.qty) <= 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Стоимость склада" value={fmt(totalValue) + ' ₽'} accent="#2196f3" color="#2196f3" />
        <MetricCard label="В наличии" value={String(inStock) + ' / ' + products.length} color={colors.text} />
      </div>

      {lowStock.length > 0 && (
        <>
          <SectionTitle>Мало на складе (&lt;10)</SectionTitle>
          {lowStock.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ff9800' }}>
                  {p.qty} {p.unit || 'шт'}
                </span>
              </div>
            </Card>
          ))}
        </>
      )}

      {outOfStock.length > 0 && (
        <>
          <SectionTitle>Нет в наличии</SectionTitle>
          {outOfStock.map(p => (
            <Card key={p.id}>
              <div style={{ fontSize: 12, color: '#EF4444' }}>{p.name}</div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

function DebtsReport() {
  const [loading, setLoading] = useState(true)
  const [debtors, setDebtors] = useState([])
  const [creditors, setCreditors] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: contractors } = await supabase
          .from('contractors').select('id, name, balance').order('name')

        const deb = [], cred = []
        for (const c of (contractors || [])) {
          const bal = Number(c.balance || 0)
          if (bal > 0) deb.push({ ...c, balance: bal })
          else if (bal < 0) cred.push({ ...c, balance: Math.abs(bal) })
        }
        deb.sort((a, b) => b.balance - a.balance)
        cred.sort((a, b) => b.balance - a.balance)
        setDebtors(deb)
        setCreditors(cred)
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const totalDebt = debtors.reduce((s, d) => s + d.balance, 0)
  const totalCredit = creditors.reduce((s, c) => s + c.balance, 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Нам должны" value={fmt(totalDebt) + ' ₽'} accent="#ff9800" color="#ff9800" />
        <MetricCard label="Мы должны" value={fmt(totalCredit) + ' ₽'} accent="#EF4444" color="#EF4444" />
      </div>

      {debtors.length > 0 && (
        <>
          <SectionTitle>Дебиторка</SectionTitle>
          {debtors.map(d => (
            <Card key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ff9800' }}>{fmt(d.balance)} ₽</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {creditors.length > 0 && (
        <>
          <SectionTitle>Кредиторка</SectionTitle>
          {creditors.map(c => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>{c.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>{fmt(c.balance)} ₽</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {debtors.length === 0 && creditors.length === 0 && (
        <EmptyState text="Нет задолженностей" />
      )}
    </div>
  )
}
