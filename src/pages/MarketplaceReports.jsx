import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, colors } from '../utils'
import { Card, MetricCard, SectionTitle, TabBar, Spinner, EmptyState } from '../components/Card.jsx'

const WB_COLOR = '#CB11AB'
const OZON_COLOR = '#005BFF'
const PROFIT_COLOR = '#10B981'
const LOSS_COLOR = '#EF4444'

function getDefaultDates() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  }
}

export default function MarketplaceReports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [products, setProducts] = useState([])
  const [tab, setTab] = useState('summary')
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultDates()
  const [dateFrom, setDateFrom] = useState(defFrom)
  const [dateTo, setDateTo] = useState(defTo)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [repRes, prodRes] = await Promise.all([
        supabase.from('marketplace_reports').select('*')
          .gte('period_from', dateFrom).lte('period_to', dateTo)
          .order('period_from', { ascending: false }),
        supabase.from('products').select('id, name, cost'),
      ])
      setReports(repRes.data || [])
      setProducts(prodRes.data || [])
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo])

  const tabs = [
    { value: 'summary', label: 'Сводка', color: PROFIT_COLOR },
    { value: 'wb', label: 'WB', color: WB_COLOR },
    { value: 'ozon', label: 'Ozon', color: OZON_COLOR },
  ]

  const inputStyle = {
    padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.secondaryBg, color: colors.text,
    fontSize: 11, outline: 'none', fontFamily: 'inherit',
    flex: 1, minWidth: 0,
  }

  return (
    <div>
      <SectionTitle>Маркетплейсы</SectionTitle>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
      </div>

      <TabBar tabs={tabs} value={tab} onChange={setTab} />

      {loading ? <Spinner /> : (
        <>
          {tab === 'summary' && <SummaryTab reports={reports} products={products} />}
          {tab === 'wb' && <MPTab reports={reports.filter(r => r.marketplace === 'wb')} products={products} color={WB_COLOR} name="Wildberries" />}
          {tab === 'ozon' && <MPTab reports={reports.filter(r => r.marketplace === 'ozon')} products={products} color={OZON_COLOR} name="Ozon" />}
        </>
      )}
    </div>
  )
}

// Match MP item name to product cost
function findCost(itemName, products) {
  if (!itemName) return 0
  const n = itemName.toLowerCase()

  // Extract volume
  let volume = ''
  const volMatch = n.match(/(\d+)\s*л/)
  if (volMatch) volume = volMatch[1] + 'л'

  // Detect brand
  let brand = ''
  if (n.includes('ext')) brand = 'Extreme'
  else if (n.includes('midline') || n.includes('worker')) brand = 'Midline'
  else if (n.includes('eco') || n.includes('newius')) brand = 'Eco'

  if (!brand) return 0

  // Try to match product
  for (const p of products) {
    const pn = p.name.toLowerCase()
    if (pn.includes(brand.toLowerCase()) && volume && pn.includes(volume)) {
      return Number(p.cost || 0)
    }
  }
  return 0
}

function calcCostFromItems(reports, products) {
  let totalCost = 0
  for (const r of reports) {
    if (!r.items) continue
    const items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items
    for (const it of items) {
      const cost = findCost(it.name, products)
      const qty = Number(it.qty_sold || 0) - Number(it.qty_returned || 0)
      totalCost += cost * qty
    }
  }
  return totalCost
}

function SummaryTab({ reports, products }) {
  if (reports.length === 0) return <EmptyState text="Нет данных за выбранный период" />

  // Aggregate all reports in period
  let totalRevenue = 0, totalLogistics = 0, totalReturns = 0, totalPenalties = 0, totalPayout = 0
  for (const r of reports) {
    totalRevenue += num(r.revenue)
    totalLogistics += num(r.logistics)
    totalReturns += Math.abs(num(r.returns))
    totalPenalties += num(r.penalties)
    totalPayout += num(r.payout)
  }

  const totalCost = calcCostFromItems(reports, products)
  const tax = totalPayout * 0.06
  const profit = totalPayout - totalCost - tax

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Выручка" value={fmt(totalRevenue) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
        <MetricCard label="К перечислению" value={fmt(totalPayout) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Себестоимость" value={fmt(totalCost) + ' ₽'} accent="#ff9800" color="#ff9800" />
        <MetricCard label="Логистика" value={fmt(totalLogistics) + ' ₽'} accent={LOSS_COLOR} color={LOSS_COLOR} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Налог 6%" value={fmt(tax) + ' ₽'} accent="#ff9800" color="#ff9800" />
        <MetricCard
          label="Чистая прибыль"
          value={fmt(profit) + ' ₽'}
          accent={profit >= 0 ? PROFIT_COLOR : LOSS_COLOR}
          color={profit >= 0 ? PROFIT_COLOR : LOSS_COLOR}
          sub={totalPayout > 0 ? `Маржа: ${(profit / totalPayout * 100).toFixed(1)}%` : ''}
        />
      </div>

      {/* P&L breakdown */}
      <SectionTitle>P&L структура</SectionTitle>
      <Card>
        <PLRow label="Выручка" value={totalRevenue} color={PROFIT_COLOR} bold />
        <PLRow label="  Возвраты" value={-totalReturns} color={LOSS_COLOR} />
        <PLRow label="  Логистика" value={-totalLogistics} color={LOSS_COLOR} />
        <PLRow label="  Штрафы" value={-totalPenalties} color={LOSS_COLOR} />
        <PLSep />
        <PLRow label="К перечислению" value={totalPayout} color={colors.text} bold />
        <PLRow label="  Себестоимость" value={-totalCost} color="#ff9800" />
        <PLRow label="  Налог УСН 6%" value={-tax} color="#ff9800" />
        <PLSep />
        <PLRow label="Чистая прибыль" value={profit} color={profit >= 0 ? PROFIT_COLOR : LOSS_COLOR} bold big />
      </Card>

      {/* Per-marketplace */}
      <SectionTitle>По площадкам</SectionTitle>
      {renderMPSummary(reports.filter(r => r.marketplace === 'wb'), products, 'Wildberries', WB_COLOR)}
      {renderMPSummary(reports.filter(r => r.marketplace === 'ozon'), products, 'Ozon', OZON_COLOR)}
    </div>
  )
}

function renderMPSummary(reports, products, name, color) {
  if (reports.length === 0) return null
  let revenue = 0, logistics = 0, returns = 0, payout = 0
  for (const r of reports) {
    revenue += num(r.revenue)
    logistics += num(r.logistics)
    returns += Math.abs(num(r.returns))
    payout += num(r.payout)
  }
  const cost = calcCostFromItems(reports, products)
  const periods = reports.map(r => r.period_from + ' — ' + r.period_to)
  const earliest = reports.reduce((m, r) => r.period_from < m ? r.period_from : m, reports[0].period_from)
  const latest = reports.reduce((m, r) => r.period_to > m ? r.period_to : m, reports[0].period_to)

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{name}</span>
        <span style={{ fontSize: 10, color: colors.hint }}>{fmtDate(earliest)} — {fmtDate(latest)}</span>
      </div>
      <MiniPL revenue={revenue} logistics={logistics} returns={returns} payout={payout} cost={cost} />
    </Card>
  )
}

function MPTab({ reports, products, color, name }) {
  if (reports.length === 0) return <EmptyState text={`Нет данных по ${name}`} />

  return (
    <div>
      <SectionTitle>{name} — отчёты</SectionTitle>
      {reports.map((r, i) => {
        const revenue = num(r.revenue)
        const logistics = num(r.logistics)
        const returns = Math.abs(num(r.returns))
        const payout = num(r.payout)
        const penalties = num(r.penalties)
        const cost = calcCostFromItems([r], products)
        return (
          <Card key={r.id || i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color }}>
                {fmtDate(r.period_from)} — {fmtDate(r.period_to)}
              </span>
              <span style={{ fontSize: 10, color: colors.hint }}>
                {fmtDate(r.loaded_at)}
              </span>
            </div>
            <MiniPL revenue={revenue} logistics={logistics} returns={returns} payout={payout} penalties={penalties} cost={cost} />
          </Card>
        )
      })}
    </div>
  )
}

function MiniPL({ revenue, logistics, returns, payout, penalties = 0, cost = 0 }) {
  const rows = [
    { label: 'Выручка', value: revenue, color: PROFIT_COLOR },
    { label: 'Логистика', value: -logistics, color: LOSS_COLOR },
    { label: 'Возвраты', value: -returns, color: LOSS_COLOR },
  ]
  if (penalties > 0) rows.push({ label: 'Штрафы', value: -penalties, color: LOSS_COLOR })
  rows.push({ label: 'К перечислению', value: payout, color: colors.text, bold: true })
  if (cost > 0) rows.push({ label: 'Себестоимость', value: -cost, color: '#ff9800' })

  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '3px 0', fontSize: 12,
          fontWeight: r.bold ? 600 : 400,
          borderTop: r.bold ? `1px solid ${colors.border}` : 'none',
          marginTop: r.bold ? 4 : 0, paddingTop: r.bold ? 6 : 3,
        }}>
          <span style={{ color: colors.hint }}>{r.label}</span>
          <span style={{ color: r.color, fontWeight: r.bold ? 600 : 500 }}>
            {r.value >= 0 ? '' : '−'}{fmt(Math.abs(r.value))} ₽
          </span>
        </div>
      ))}
    </div>
  )
}

function PLRow({ label, value, color, bold, big }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0',
      fontSize: big ? 15 : 12,
      fontWeight: bold ? 600 : 400,
    }}>
      <span style={{ color: bold ? colors.text : colors.hint }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 500 }}>
        {value >= 0 ? '' : '−'}{fmt(Math.abs(value))} ₽
      </span>
    </div>
  )
}

function PLSep() {
  return <div style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />
}

function num(v) { return Number(v || 0) }
