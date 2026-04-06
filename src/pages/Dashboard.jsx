import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, DOC_TYPE_MAP, DOC_TYPE_COLORS, colors } from '../utils'
import { Card, MetricCard, SectionTitle, Spinner, ErrorMsg, EmptyState, FilterChips } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

const PROFIT_COLOR = '#10B981'
const LOSS_COLOR = '#EF4444'
const TAX_RATE = 0.06

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: '3month', label: '3 мес' },
  { value: 'custom', label: 'Даты' },
]

function getPeriodDates(period) {
  const now = new Date()
  let from
  if (period === 'week') {
    from = new Date(now.getTime() - 7 * 86400000)
  } else if (period === '3month') {
    from = new Date(now.getTime() - 90 * 86400000)
  } else {
    // month = last 30 days
    from = new Date(now.getTime() - 30 * 86400000)
  }
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

async function fetchWBProfit(dateFrom, dateTo) {
  try {
    const resp = await supabase.functions.invoke('mp-reports', {
      body: { marketplace: 'wb', dateFrom, dateTo },
    })
    const data = resp.data
    if (resp.error || !data?.ok) return null
    const rows = data.data || []
    const sales = rows.filter(r => r.doc_type_name === 'Продажа')
    const returns = rows.filter(r => r.doc_type_name === 'Возврат')
    const totalForPay = sales.reduce((s, r) => s + (Number(r.ppvz_for_pay) || 0), 0)
    const totalLogist = rows.reduce((s, r) => s + (Number(r.delivery_rub) || 0), 0)
    const totalStorage = rows.reduce((s, r) => s + (Number(r.storage_fee) || 0), 0)
    const totalPenalty = rows.reduce((s, r) => s + (Number(r.penalty) || 0), 0)
    const returnForPay = returns.reduce((s, r) => s + Math.abs(Number(r.ppvz_for_pay) || 0), 0)
    const totalCost = sales.reduce((s, r) => s + ((Number(r.quantity) || 0) * (Number(r._cost) || 0)), 0)
    const grossPay = totalForPay - returnForPay - totalLogist - totalStorage - totalPenalty
    const tax = Math.round(totalForPay * TAX_RATE)
    const profit = grossPay - totalCost - tax
    return { profit, totalForPay }
  } catch (_) {
    return null
  }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [redZoneOpen, setRedZoneOpen] = useState(false)
  const [salesOpen, setSalesOpen] = useState(false)
  const [wbProfit, setWbProfit] = useState(null)
  const [wbLoading, setWbLoading] = useState(false)

  const getDateRange = () => {
    if (period === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }
    return getPeriodDates(period)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { from, to } = getDateRange()

      const [salesRes, accRes, contrRes, prodRes, draftsRes, docsRes, diRes] = await Promise.all([
        supabase.from('documents').select('amount, contractor_id')
          .in('doc_type', ['torg12', 'ttn']).eq('status', 'posted')
          .gte('doc_date', from).lte('doc_date', to),
        supabase.from('financial_accounts').select('balance, include_in_balance').eq('is_active', true),
        supabase.from('contractors').select('balance'),
        supabase.from('products').select('id, name, qty, unit, category')
          .order('qty', { ascending: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('documents').select('id, num, doc_type, doc_date, amount, status, contractor_id, contractors(name)')
          .order('doc_date', { ascending: false }).limit(5),
        // Cost breakdown: document_items with product cost for direct sales
        supabase.from('document_items')
          .select('qty, price, product_id, products(name, cost), documents!inner(contractor_id, accounting_type)')
          .in('documents.doc_type', ['torg12', 'ttn'])
          .eq('documents.status', 'posted')
          .gte('documents.doc_date', from)
          .lte('documents.doc_date', to),
      ])

      const directSales = (salesRes.data || []).filter(d => d.contractor_id !== 2 && d.contractor_id !== 8)
      const sales = directSales.reduce((s, d) => s + Number(d.amount || 0), 0)

      // Calculate cost from document_items (exclude MP contractors)
      const directItems = (diRes.data || []).filter(i => {
        const cid = i.documents?.contractor_id
        return cid !== 2 && cid !== 8
      })
      let totalCost = 0, totalRevenue = 0, officialRevenue = 0
      for (const it of directItems) {
        const qty = Number(it.qty || 0)
        const cost = Number(it.products?.cost || 0)
        const price = Number(it.price || 0)
        totalCost += qty * cost
        totalRevenue += qty * price
        if (it.documents?.accounting_type === 'official') {
          officialRevenue += qty * price
        }
      }
      const salesTax = Math.round(officialRevenue * TAX_RATE)
      const salesProfit = totalRevenue - totalCost - salesTax
      const balance = (accRes.data || []).filter(a => a.include_in_balance !== false)
        .reduce((s, a) => s + Number(a.balance || 0), 0)

      let debit = 0, credit = 0
      for (const c of (contrRes.data || [])) {
        const bal = Number(c.balance || 0)
        if (bal > 0) debit += bal
        else if (bal < 0) credit += Math.abs(bal)
      }

      // Sort red zone: products first (by qty desc), then materials (by qty desc)
      const allItems = prodRes.data || []
      const isProduct = (p) => {
        const cat = (p.category || '').toLowerCase()
        const name = (p.name || '').toLowerCase()
        return cat.includes('продукц') || cat.includes('товар') ||
          name.includes('автошампунь') || name.includes('шампунь') ||
          name.includes('воск') || name.includes('детейлер') || name.includes('eco') ||
          name.includes('extreme') || name.includes('midline') || name.includes('ручной')
      }
      const byQtyDesc = (a, b) => Number(b.qty || 0) - Number(a.qty || 0)
      const products = allItems.filter(isProduct).sort(byQtyDesc)
      const materials = allItems.filter(p => !isProduct(p)).sort(byQtyDesc)
      const redZone = [...products, ...materials]

      setData({
        sales, balance, debit, credit, redZone,
        totalCost, totalRevenue, officialRevenue, salesTax, salesProfit,
        draftsCount: draftsRes.count || 0,
        recentDocs: docsRes.data || [],
      })

      // Fetch WB profit in parallel
      setWbLoading(true)
      const wb = await fetchWBProfit(from, to)
      setWbProfit(wb)
      setWbLoading(false)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [period, customFrom, customTo])

  const inputStyle = {
    padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.secondaryBg, color: colors.text,
    fontSize: 11, outline: 'none', fontFamily: 'inherit',
    flex: 1, minWidth: 0,
  }

  if (loading && !data) return <Spinner />
  if (error) return <ErrorMsg msg={error} />
  if (!data) return null

  return (
    <div>
      <SectionTitle right={
        <div onClick={load} style={{ fontSize: 10, color: colors.button, cursor: 'pointer' }}>Обновить</div>
      }>Продажи</SectionTitle>

      <FilterChips options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
        </div>
      )}

      {/* Выручка — expandable with P&L */}
      <div onClick={() => setSalesOpen(prev => !prev)} style={{ cursor: 'pointer' }}>
        <MetricCard label="Выручка (прямые продажи)" value={fmt(data.sales) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR}
          sub={salesOpen ? '' : `прибыль ${fmt(data.salesProfit)} ₽ · нажмите для детализации`} />
      </div>
      {salesOpen && (
        <Card style={{ marginTop: -4 }}>
          {[
            { label: 'Выручка', value: data.totalRevenue, color: PROFIT_COLOR, bold: true },
            { label: 'Себестоимость', value: -data.totalCost, color: '#ff9800' },
            { label: `Налог УСН 6% (от ${fmt(data.officialRevenue)} ₽ офиц.)`, value: -data.salesTax, color: '#ff9800' },
            null,
            { label: 'Чистая прибыль (прямые)', value: data.salesProfit, color: data.salesProfit >= 0 ? PROFIT_COLOR : LOSS_COLOR, bold: true },
          ].map((row, i) => row === null ? (
            <div key={i} style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />
          ) : (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0', fontSize: 12, fontWeight: row.bold ? 600 : 400,
            }}>
              <span style={{ color: row.bold ? colors.text : colors.hint }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: row.bold ? 700 : 500 }}>
                {row.value < 0 ? '−' : ''}{fmt(Math.abs(row.value))} ₽
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* WB Profit */}
      <MetricCard
        label="Прибыль WB"
        value={wbLoading ? '...' : wbProfit ? fmt(wbProfit.profit) + ' ₽' : '—'}
        accent="#CB11AB"
        color={wbProfit && wbProfit.profit >= 0 ? PROFIT_COLOR : wbProfit ? LOSS_COLOR : colors.hint}
        sub={wbProfit ? `к перечисл. ${fmt(wbProfit.totalForPay)} ₽` : ''}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Баланс счетов" value={fmt(data.balance) + ' ₽'}
          accent={data.balance >= 0 ? PROFIT_COLOR : LOSS_COLOR}
          color={data.balance >= 0 ? PROFIT_COLOR : LOSS_COLOR} />
        <MetricCard label="Нам должны" value={fmt(data.debit) + ' ₽'} accent="#ff9800" color="#ff9800" />
      </div>

      <MetricCard label="Мы должны" value={fmt(data.credit) + ' ₽'} accent={LOSS_COLOR} color={LOSS_COLOR} />

      {data.draftsCount > 0 && (
        <Card style={{ background: '#ff980010', borderColor: '#ff980033' }}>
          <div style={{ fontSize: 11, color: '#ff9800' }}>
            Непроведённых черновиков: <b>{data.draftsCount}</b>
          </div>
        </Card>
      )}

      {/* Red zone — collapsible */}
      {data.redZone.length > 0 && (
        <>
          <div
            onClick={() => setRedZoneOpen(prev => !prev)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', padding: '8px 0', marginTop: 8,
            }}
          >
            <SectionTitle style={{ margin: 0 }}>Остатки в красной зоне ({data.redZone.length})</SectionTitle>
            <span style={{ fontSize: 14, color: colors.hint, transition: 'transform 0.2s', transform: redZoneOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          {redZoneOpen && data.redZone.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: Number(p.qty) <= 0 ? LOSS_COLOR : '#ff9800' }}>
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
