import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, colors } from '../utils'
import { Card, MetricCard, SectionTitle, TabBar, Spinner, EmptyState } from '../components/Card.jsx'

const WB_COLOR = '#CB11AB'
const OZON_COLOR = '#005BFF'
const PROFIT_COLOR = '#10B981'
const LOSS_COLOR = '#EF4444'
const TAX_RATE = 0.06

function getDefaultDates() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  }
}

async function fetchMP(marketplace, dateFrom, dateTo) {
  const { data, error } = await supabase.functions.invoke('mp-reports', {
    body: { marketplace, dateFrom, dateTo },
  })
  if (error) throw new Error(error.message || 'Edge function error')
  if (!data?.ok) throw new Error(data?.error || 'Unknown error')
  return data.data || []
}

// Aggregate WB detailed report rows into P&L
function aggregateWB(rows) {
  const sales = rows.filter(r => r.doc_type_name === 'Продажа')
  const returns = rows.filter(r => r.doc_type_name === 'Возврат')

  const totalForPay = sales.reduce((s, r) => s + (Number(r.ppvz_for_pay) || 0), 0)
  const totalLogist = rows.reduce((s, r) => s + (Number(r.delivery_rub) || 0), 0)
  const totalStorage = rows.reduce((s, r) => s + (Number(r.storage_fee) || 0), 0)
  const totalPenalty = rows.reduce((s, r) => s + (Number(r.penalty) || 0), 0)
  const returnForPay = returns.reduce((s, r) => s + Math.abs(Number(r.ppvz_for_pay) || 0), 0)
  const totalCost = sales.reduce((s, r) => s + ((Number(r.quantity) || 0) * (Number(r._cost) || 0)), 0)
  const salesQty = sales.reduce((s, r) => s + (Number(r.quantity) || 0), 0)

  const grossPay = totalForPay - returnForPay - totalLogist - totalStorage - totalPenalty
  const tax = Math.round(totalForPay * TAX_RATE)
  const profit = grossPay - totalCost - tax
  const margin = totalForPay ? Math.round(profit / totalForPay * 1000) / 10 : 0

  // By month
  const byMonth = {}
  for (const r of rows) {
    const d = (r.rr_dt || r.date_from || '').slice(0, 7)
    if (!d) continue
    if (!byMonth[d]) byMonth[d] = { forPay: 0, logist: 0, storage: 0, cost: 0, qty: 0, returnPay: 0, penalty: 0 }
    const m = byMonth[d]
    if (r.doc_type_name === 'Продажа') {
      m.forPay += Number(r.ppvz_for_pay) || 0
      m.cost += (Number(r.quantity) || 0) * (Number(r._cost) || 0)
      m.qty += Number(r.quantity) || 0
    }
    if (r.doc_type_name === 'Возврат') m.returnPay += Math.abs(Number(r.ppvz_for_pay) || 0)
    m.logist += Number(r.delivery_rub) || 0
    m.storage += Number(r.storage_fee) || 0
    m.penalty += Number(r.penalty) || 0
  }
  const monthly = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, m]) => {
    const gross = m.forPay - m.returnPay - m.logist - m.storage - m.penalty
    const tx = Math.round(m.forPay * TAX_RATE)
    const prof = gross - m.cost - tx
    const mg = m.forPay ? Math.round(prof / m.forPay * 1000) / 10 : 0
    return { month, ...m, gross, tax: tx, profit: prof, margin: mg }
  })

  // Top articles
  const byArt = {}
  for (const r of sales) {
    const key = r.sa_name || r.supplierArticle || String(r.nm_id) || '—'
    if (!byArt[key]) byArt[key] = { article: key, product: r._product || '', forPay: 0, cost: 0, qty: 0 }
    const a = byArt[key]
    a.forPay += Number(r.ppvz_for_pay) || 0
    a.cost += (Number(r.quantity) || 0) * (Number(r._cost) || 0)
    a.qty += Number(r.quantity) || 0
  }
  const articles = Object.values(byArt).sort((a, b) => b.forPay - a.forPay).map(a => {
    const tx = Math.round(a.forPay * TAX_RATE)
    const prof = a.forPay - a.cost - tx
    return { ...a, tax: tx, profit: prof, margin: a.forPay ? Math.round(prof / a.forPay * 100) : 0 }
  })

  return {
    totalForPay, totalLogist, totalStorage, totalPenalty, returnForPay, totalCost,
    grossPay, tax, profit, margin, salesQty, monthly, articles,
  }
}

// Aggregate Ozon operations
function aggregateOzon(operations) {
  let revenue = 0, commission = 0, logistics = 0, returns = 0, other = 0
  for (const op of operations) {
    const services = op.services || []
    const items = op.items || []
    const amount = Number(op.amount) || 0

    if (op.operation_type === 'OperationAgentDeliveredToCustomer') {
      revenue += amount
    } else if (op.operation_type === 'OperationReturnGoodsFBSofRMS' || (op.operation_type || '').includes('Return')) {
      returns += Math.abs(amount)
    }

    for (const svc of services) {
      const sAmount = Number(svc.price) || 0
      if ((svc.name || '').includes('логист') || (svc.name || '').includes('Логист')) {
        logistics += Math.abs(sAmount)
      } else if ((svc.name || '').includes('комисс') || (svc.name || '').includes('Комисс')) {
        commission += Math.abs(sAmount)
      }
    }
  }

  const payout = revenue - commission - logistics - returns
  const tax = Math.round(revenue * TAX_RATE)
  const profit = payout - tax

  return { revenue, commission, logistics, returns, payout, tax, profit, opCount: operations.length }
}

export default function MarketplaceReports() {
  const [tab, setTab] = useState('wb')
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultDates()
  const [dateFrom, setDateFrom] = useState(defFrom)
  const [dateTo, setDateTo] = useState(defTo)

  const tabs = [
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

      {tab === 'wb' && <WBTab dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'ozon' && <OzonTab dateFrom={dateFrom} dateTo={dateTo} />}
    </div>
  )
}

function WBTab({ dateFrom, dateTo }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchMP('wb', dateFrom, dateTo)
      setData(aggregateWB(rows))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  if (loading) return <Spinner />
  if (error) return (
    <Card>
      <div style={{ fontSize: 12, color: LOSS_COLOR }}>{error}</div>
      <div onClick={load} style={{ fontSize: 11, color: colors.button, marginTop: 8, cursor: 'pointer' }}>Повторить</div>
    </Card>
  )
  if (!data) return <EmptyState text="Нажмите загрузить" />

  return (
    <div>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="К перечислению" value={fmt(data.totalForPay) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
        <MetricCard label="Выкуплено" value={data.salesQty + ' шт'} accent={PROFIT_COLOR} color={colors.text} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Логист.+хран." value={fmt(data.totalLogist + data.totalStorage) + ' ₽'} accent={LOSS_COLOR} color={LOSS_COLOR} />
        <MetricCard
          label="Чистая прибыль"
          value={fmt(data.profit) + ' ₽'}
          accent={data.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR}
          color={data.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR}
          sub={`маржа ${data.margin}%`}
        />
      </div>

      {/* P&L */}
      <SectionTitle>Структура P&L</SectionTitle>
      <Card>
        <PLRow label="(+) К перечислению за товар" value={data.totalForPay} color={PROFIT_COLOR} bold />
        <PLRow label="(−) Возвраты" value={-data.returnForPay} color={LOSS_COLOR} />
        <PLRow label="(−) Логистика WB" value={-data.totalLogist} color={LOSS_COLOR} />
        <PLRow label="(−) Хранение WB" value={-data.totalStorage} color={LOSS_COLOR} />
        <PLRow label="(−) Штрафы" value={-data.totalPenalty} color={LOSS_COLOR} />
        <PLSep />
        <PLRow label="Итого к перечислению (факт)" value={data.grossPay} color={colors.text} bold />
        <PLRow label="(−) Себестоимость" value={-data.totalCost} color="#ff9800" />
        <PLRow label="(−) Налог УСН 6%" value={-data.tax} color="#ff9800" />
        <PLSep />
        <PLRow label="ЧИСТАЯ ПРИБЫЛЬ" value={data.profit} color={data.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR} bold big />
        {data.margin !== 0 && (
          <div style={{ fontSize: 10, color: colors.hint, textAlign: 'right', marginTop: 2 }}>маржа {data.margin}%</div>
        )}
      </Card>

      {/* Monthly */}
      {data.monthly.length > 0 && (
        <>
          <SectionTitle>По месяцам</SectionTitle>
          {data.monthly.map((m, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: WB_COLOR }}>{m.month}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: m.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR,
                }}>{fmt(m.profit)} ₽</span>
              </div>
              <MiniPL
                rows={[
                  { label: 'К перечислению', value: m.forPay, color: PROFIT_COLOR },
                  { label: 'Логист.+хран.', value: -(m.logist + m.storage), color: LOSS_COLOR },
                  { label: 'Возвраты', value: -m.returnPay, color: LOSS_COLOR },
                  { label: 'Себестоимость', value: -m.cost, color: '#ff9800' },
                  { label: 'Налог 6%', value: -m.tax, color: '#ff9800' },
                  { label: 'Прибыль', value: m.profit, color: m.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR, bold: true },
                ]}
              />
            </Card>
          ))}
        </>
      )}

      {/* Top articles */}
      {data.articles.length > 0 && (
        <>
          <SectionTitle>По артикулам</SectionTitle>
          {data.articles.slice(0, 10).map((a, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{a.product || a.article}</div>
                  {a.product && <div style={{ fontSize: 10, color: colors.hint }}>{a.article}</div>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: a.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR }}>
                  {fmt(a.profit)} ₽
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: colors.hint }}>
                <span>{a.qty} шт</span>
                <span>выр. {fmt(a.forPay)} ₽</span>
                <span>маржа {a.margin}%</span>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

function OzonTab({ dateFrom, dateTo }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const ops = await fetchMP('ozon', dateFrom, dateTo)
      setData(aggregateOzon(ops))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  if (loading) return <Spinner />
  if (error) return (
    <Card>
      <div style={{ fontSize: 12, color: LOSS_COLOR }}>{error}</div>
      <div onClick={load} style={{ fontSize: 11, color: colors.button, marginTop: 8, cursor: 'pointer' }}>Повторить</div>
    </Card>
  )
  if (!data) return <EmptyState text="Нет данных" />

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Выручка" value={fmt(data.revenue) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
        <MetricCard label="К перечислению" value={fmt(data.payout) + ' ₽'} accent={OZON_COLOR} color={OZON_COLOR} />
      </div>

      <SectionTitle>P&L Ozon</SectionTitle>
      <Card>
        <PLRow label="Выручка" value={data.revenue} color={PROFIT_COLOR} bold />
        <PLRow label="(−) Комиссия" value={-data.commission} color={LOSS_COLOR} />
        <PLRow label="(−) Логистика" value={-data.logistics} color={LOSS_COLOR} />
        <PLRow label="(−) Возвраты" value={-data.returns} color={LOSS_COLOR} />
        <PLSep />
        <PLRow label="К перечислению" value={data.payout} color={colors.text} bold />
        <PLRow label="(−) Налог УСН 6%" value={-data.tax} color="#ff9800" />
        <PLSep />
        <PLRow label="Прибыль" value={data.profit} color={data.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR} bold big />
      </Card>

      <div style={{ fontSize: 10, color: colors.hint, marginTop: 8, textAlign: 'center' }}>
        Операций: {data.opCount}
      </div>
    </div>
  )
}

function MiniPL({ rows }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '3px 0', fontSize: 11,
          fontWeight: r.bold ? 600 : 400,
          borderTop: r.bold ? `1px solid ${colors.border}` : 'none',
          marginTop: r.bold ? 4 : 0, paddingTop: r.bold ? 6 : 3,
        }}>
          <span style={{ color: colors.hint }}>{r.label}</span>
          <span style={{ color: r.color, fontWeight: r.bold ? 600 : 500 }}>
            {r.value < 0 ? '−' : ''}{fmt(Math.abs(r.value))} ₽
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
      fontSize: big ? 14 : 12,
      fontWeight: bold ? 600 : 400,
    }}>
      <span style={{ color: bold ? colors.text : colors.hint }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 500 }}>
        {value < 0 ? '−' : ''}{fmt(Math.abs(value))} ₽
      </span>
    </div>
  )
}

function PLSep() {
  return <div style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />
}
