import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmtInt, fmt, colors } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState, SearchInput, FilterChips } from '../components/Card.jsx'

const CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'химикаты', label: 'Химикаты' },
  { value: 'тара', label: 'Тара' },
  { value: 'концентраты', label: 'Концентраты' },
  { value: 'продукция', label: 'Продукция' },
]

const SORTS = [
  { value: 'name', label: 'По имени' },
  { value: 'qty', label: 'По остатку' },
]

export default function Warehouse() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('name')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('id, name, category, qty, unit, cost')
        .order('name')

      if (err) throw err
      setProducts(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  let filtered = products
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(p => p.name?.toLowerCase().includes(q))
  }
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category?.toLowerCase() === category)
  }

  if (sort === 'qty') {
    filtered = [...filtered].sort((a, b) => (a.qty || 0) - (b.qty || 0))
  } else {
    filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
  }

  return (
    <div>
      <SectionTitle>Склад ({filtered.length})</SectionTitle>
      <SearchInput value={search} onChange={setSearch} placeholder="Поиск товара..." />
      <FilterChips options={CATEGORIES} value={category} onChange={setCategory} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {SORTS.map(s => (
          <div
            key={s.value}
            onClick={() => setSort(s.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              cursor: 'pointer',
              background: sort === s.value ? colors.button + '33' : 'transparent',
              color: sort === s.value ? colors.button : colors.hint,
              fontFamily: 'inherit',
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Товары не найдены" />
      ) : (
        filtered.map(p => {
          const isLow = (p.qty || 0) < 20
          return (
            <Card key={p.id}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: colors.hint }}>
                  {p.category || '—'} &middot; {p.unit || 'шт'}
                </span>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isLow ? '#f44336' : colors.text,
                }}>
                  {fmtInt(p.qty)}
                </span>
              </div>
              {p.cost != null && (
                <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>
                  Себест.: {fmt(p.cost)} ₽
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
