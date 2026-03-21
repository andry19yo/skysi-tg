import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmtDate, fmt, colors } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState, SearchInput, FilterChips } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

const STATUS_COLORS = {
  new: '#2196f3',
  confirmed: '#4caf50',
  processing: '#ff9800',
  shipped: '#9c27b0',
  delivered: '#4caf50',
  cancelled: '#f44336',
}

const STATUS_LABELS = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export default function Orders() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err
      setOrders(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const platformOptions = [
    { value: 'all', label: 'Все' },
    { value: 'wb', label: 'Wildberries' },
    { value: 'ozon', label: 'Ozon' },
  ]

  let filtered = orders
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(o =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.external_id || '').toLowerCase().includes(q)
    )
  }
  if (platform !== 'all') {
    filtered = filtered.filter(o => (o.platform || o.source || '').toLowerCase() === platform)
  }

  if (orders.length === 0) {
    return (
      <div>
        <SectionTitle>Заказы маркетплейсов</SectionTitle>
        <EmptyState text="Нет заказов" />
      </div>
    )
  }

  return (
    <div>
      <SectionTitle>Заказы МП ({filtered.length})</SectionTitle>
      <SearchInput value={search} onChange={setSearch} placeholder="Поиск по номеру..." />
      <FilterChips options={platformOptions} value={platform} onChange={setPlatform} />

      {filtered.length === 0 ? (
        <EmptyState text="Заказы не найдены" />
      ) : (
        filtered.map(o => {
          const status = o.status || 'new'
          const src = (o.platform || o.source || '').toUpperCase()
          return (
            <Card key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  #{o.order_number || o.external_id || o.id}
                </div>
                <span style={{ fontSize: 11, color: colors.hint }}>{fmtDate(o.created_at)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {src && (
                  <Badge color={src === 'WB' ? '#cb11ab' : src === 'OZON' ? '#005bff' : '#888'}>
                    {src}
                  </Badge>
                )}
                <Badge color={STATUS_COLORS[status] || '#888'}>
                  {STATUS_LABELS[status] || status}
                </Badge>
              </div>
              {o.total_amount != null && (
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                  {fmt(o.total_amount)} ₽
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
