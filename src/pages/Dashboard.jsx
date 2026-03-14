import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Card, SectionTitle, Badge, Spinner, ErrorMsg } from '../components/Card.jsx'

const tg = window.Telegram?.WebApp

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ru-RU')
}

export default function Dashboard() {
  const [stock, setStock]     = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Остатки склада в красной зоне (qty < 20)
        const { data: stockData, error: stockErr } = await supabase
          .from('products')
          .select('id, name, qty, min_qty, unit, product_groups(name)')
          .lt('qty', 20)
          .order('qty', { ascending: true })
          .limit(20)

        if (stockErr) throw stockErr

        const redZone = stockData || []

        // Баланс счетов
        const { data: accData, error: accErr } = await supabase
          .from('financial_accounts')
          .select('id, name, balance, acc_type')
          .order('balance', { ascending: false })

        if (accErr) throw accErr

        setStock(redZone)
        setAccounts(accData || [])
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

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)

  return (
    <div>
      <SectionTitle>Баланс счетов</SectionTitle>
      <Card>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
          {fmt(totalBalance)} ₽
        </div>
        <div style={{ fontSize: 11, color: tg?.themeParams?.hint_color || '#888' }}>
          итого по {accounts.length} счетам
        </div>
        {accounts.slice(0, 3).map(a => (
          <div key={a.id} style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 10, fontSize: 13,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 8,
          }}>
            <span style={{ color: tg?.themeParams?.hint_color || '#aaa' }}>{a.name}</span>
            <span>{fmt(a.balance)} ₽</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Красная зона склада</SectionTitle>
      {stock.length === 0 ? (
        <Card>
          <span style={{ color: '#4caf50', fontSize: 13 }}>Все остатки в норме</span>
        </Card>
      ) : (
        stock.map(item => (
          <Card key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: tg?.themeParams?.hint_color || '#888' }}>
                  {item.product_groups?.name || ''}{item.min_qty > 0 ? ` · мин: ${fmt(item.min_qty)}` : ''}
                </div>
              </div>
              <Badge color="#f44336">
                {fmt(item.qty)} {item.unit || ''}
              </Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
