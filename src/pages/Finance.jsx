import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Card, SectionTitle, Badge, Spinner, ErrorMsg } from '../components/Card.jsx'

const tg = window.Telegram?.WebApp

function fmt(n) {
  if (n == null) return '—'
  const abs = Math.abs(Number(n))
  const s = abs.toLocaleString('ru-RU')
  return (n < 0 ? '−' : '') + s
}

function BalanceBar({ positive, negative }) {
  const total = positive + Math.abs(negative)
  if (!total) return null
  const posPct = (positive / total) * 100
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: posPct + '%', background: '#4caf50' }} />
      <div style={{ width: (100 - posPct) + '%', background: '#f44336' }} />
    </div>
  )
}

export default function Finance() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('financial_accounts')
          .select('id, name, balance, acc_type, accounting_type')
          .order('balance', { ascending: false })

        if (err) throw err
        setAccounts(data || [])
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

  const totalPositive = accounts.filter(a => (a.balance || 0) > 0).reduce((s, a) => s + a.balance, 0)
  const totalNegative = accounts.filter(a => (a.balance || 0) < 0).reduce((s, a) => s + a.balance, 0)
  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const grouped = accounts.reduce((acc, a) => {
    const key = a.acc_type || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const TYPE_LABELS = {
    checking: 'Расчётные счета',
    cash:     'Наличные',
    savings:  'Сберегательные',
    credit:   'Кредиты',
    other:    'Прочее',
  }

  return (
    <div>
      <SectionTitle>Общий баланс</SectionTitle>
      <Card>
        <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 4, color: total >= 0 ? '#4caf50' : '#f44336' }}>
          {fmt(total)} ₽
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 8 }}>
          <span style={{ color: '#4caf50' }}>+{fmt(totalPositive)}</span>
          <span style={{ color: '#f44336' }}>−{fmt(Math.abs(totalNegative))}</span>
        </div>
        <BalanceBar positive={totalPositive} negative={totalNegative} />
      </Card>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <SectionTitle>{TYPE_LABELS[type] || type}</SectionTitle>
          {items.map(a => (
            <Card key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                  {a.accounting_type && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{a.accounting_type}</div>
                  )}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: (a.balance || 0) >= 0 ? (tg?.themeParams?.text_color || '#fff') : '#f44336',
                }}>
                  {fmt(a.balance)} ₽
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {accounts.length === 0 && (
        <Card><span style={{ color: '#888', fontSize: 13 }}>Счета не найдены</span></Card>
      )}
    </div>
  )
}
