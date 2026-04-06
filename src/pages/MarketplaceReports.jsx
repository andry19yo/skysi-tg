import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, colors } from '../utils'
import { Card, MetricCard, SectionTitle, TabBar, Spinner, EmptyState } from '../components/Card.jsx'

const WB_COLOR = '#CB11AB'
const OZON_COLOR = '#005BFF'
const PROFIT_COLOR = '#10B981'
const LOSS_COLOR = '#EF4444'

export default function MarketplaceReports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [tab, setTab] = useState('summary')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('marketplace_reports')
        .select('*')
        .order('period_from', { ascending: false })
      setReports(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const tabs = [
    { value: 'summary', label: 'Сводка', color: PROFIT_COLOR },
    { value: 'wb', label: 'WB', color: WB_COLOR },
    { value: 'ozon', label: 'Ozon', color: OZON_COLOR },
  ]

  return (
    <div>
      <SectionTitle>Маркетплейсы</SectionTitle>
      <TabBar tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'summary' && <SummaryTab reports={reports} />}
      {tab === 'wb' && <MPTab reports={reports.filter(r => r.marketplace === 'wb')} color={WB_COLOR} name="Wildberries" />}
      {tab === 'ozon' && <MPTab reports={reports.filter(r => r.marketplace === 'ozon')} color={OZON_COLOR} name="Ozon" />}
    </div>
  )
}

function SummaryTab({ reports }) {
  // Aggregate latest reports from each marketplace
  const latestWB = reports.filter(r => r.marketplace === 'wb').sort((a, b) => b.period_to.localeCompare(a.period_to))[0]
  const latestOzon = reports.filter(r => r.marketplace === 'ozon').sort((a, b) => b.period_to.localeCompare(a.period_to))[0]

  const totalRevenue = num(latestWB?.revenue) + num(latestOzon?.revenue)
  const totalLogistics = num(latestWB?.logistics) + num(latestOzon?.logistics)
  const totalReturns = Math.abs(num(latestWB?.returns)) + Math.abs(num(latestOzon?.returns))
  const totalPenalties = num(latestWB?.penalties) + num(latestOzon?.penalties)
  const totalPayout = num(latestWB?.payout) + num(latestOzon?.payout)
  const totalExpenses = totalLogistics + totalReturns + totalPenalties
  const tax = totalPayout * 0.06
  const profit = totalPayout - tax

  if (!latestWB && !latestOzon) return <EmptyState text="Нет данных по маркетплейсам" />

  return (
    <div>
      {/* P&L metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Выручка" value={fmt(totalRevenue) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
        <MetricCard label="К перечислению" value={fmt(totalPayout) + ' ₽'} accent={PROFIT_COLOR} color={PROFIT_COLOR} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Логистика" value={fmt(totalLogistics) + ' ₽'} accent={LOSS_COLOR} color={LOSS_COLOR} />
        <MetricCard label="Возвраты" value={fmt(totalReturns) + ' ₽'} accent={LOSS_COLOR} color={LOSS_COLOR} />
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
        <PLRow label="  Налог УСН 6%" value={-tax} color="#ff9800" />
        <PLSep />
        <PLRow label="Чистая прибыль" value={profit} color={profit >= 0 ? PROFIT_COLOR : LOSS_COLOR} bold big />
      </Card>

      {/* Per-marketplace breakdown */}
      <SectionTitle>По площадкам</SectionTitle>
      {latestWB && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: WB_COLOR }}>Wildberries</span>
            <span style={{ fontSize: 10, color: colors.hint }}>{fmtDate(latestWB.period_from)} — {fmtDate(latestWB.period_to)}</span>
          </div>
          <MiniPL revenue={num(latestWB.revenue)} logistics={num(latestWB.logistics)} returns={Math.abs(num(latestWB.returns))} payout={num(latestWB.payout)} />
        </Card>
      )}
      {latestOzon && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: OZON_COLOR }}>Ozon</span>
            <span style={{ fontSize: 10, color: colors.hint }}>{fmtDate(latestOzon.period_from)} — {fmtDate(latestOzon.period_to)}</span>
          </div>
          <MiniPL revenue={num(latestOzon.revenue)} logistics={num(latestOzon.logistics)} returns={Math.abs(num(latestOzon.returns))} payout={num(latestOzon.payout)} />
        </Card>
      )}
    </div>
  )
}

function MPTab({ reports, color, name }) {
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
            <MiniPL revenue={revenue} logistics={logistics} returns={returns} payout={payout} penalties={penalties} />
          </Card>
        )
      })}
    </div>
  )
}

function MiniPL({ revenue, logistics, returns, payout, penalties = 0 }) {
  const rows = [
    { label: 'Выручка', value: revenue, color: PROFIT_COLOR },
    { label: 'Логистика', value: -logistics, color: LOSS_COLOR },
    { label: 'Возвраты', value: -returns, color: LOSS_COLOR },
  ]
  if (penalties > 0) rows.push({ label: 'Штрафы', value: -penalties, color: LOSS_COLOR })
  rows.push({ label: 'К перечислению', value: payout, color: colors.text, bold: true })

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
