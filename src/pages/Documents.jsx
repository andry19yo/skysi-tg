import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, DOC_TYPE_MAP, DOC_TYPE_COLORS, DOC_STATUS_MAP, STATUS_COLORS, ACCOUNTING_MAP, colors, tg } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState, SearchInput, FilterChips } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'
import DocDetail from '../components/DocDetail.jsx'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'receipt', label: 'Приходная' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'torg12', label: 'ТОРГ-12' },
  { value: 'payment', label: 'Оплата' },
  { value: 'return', label: 'Возврат' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'draft', label: 'Черновики' },
  { value: 'posted', label: 'Проведённые' },
]

const ACCOUNTING_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'official', label: 'Офиц.' },
  { value: 'internal', label: 'Внутр.' },
]

export default function Documents() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [docs, setDocs] = useState([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [accFilter, setAccFilter] = useState('all')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('documents')
        .select('id, num, doc_type, doc_date, amount, status, accounting_type, contractor_id, contractors(name)')
        .order('doc_date', { ascending: false })
        .limit(50)

      if (typeFilter !== 'all') query = query.eq('doc_type', typeFilter)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (accFilter !== 'all') query = query.eq('accounting_type', accFilter)

      const { data, error: err } = await query
      if (err) throw err
      setDocs(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFilter, statusFilter, accFilter])

  const openDoc = useCallback((doc) => {
    setSelectedDoc(doc)
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(() => {
        setSelectedDoc(null)
        tg.BackButton.hide()
      })
    }
  }, [])

  const closeDoc = useCallback(() => {
    setSelectedDoc(null)
    if (tg?.BackButton) tg.BackButton.hide()
  }, [])

  if (selectedDoc) {
    return <DocDetail docId={selectedDoc.id} onBack={closeDoc} onNavigate={(id) => {
      setSelectedDoc({ id })
    }} />
  }

  if (showCreate) {
    return <CreateDraft onBack={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
  }

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionTitle>Документы ({docs.length})</SectionTitle>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: colors.button,
            color: colors.buttonText,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Черновик
        </button>
      </div>

      <FilterChips options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
      <FilterChips options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      <FilterChips options={ACCOUNTING_OPTIONS} value={accFilter} onChange={setAccFilter} />

      {docs.length === 0 ? (
        <EmptyState text="Документы не найдены" />
      ) : (
        docs.map(d => (
          <Card key={d.id} onClick={() => openDoc(d)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge color={DOC_TYPE_COLORS[d.doc_type] || '#888'}>
                  {DOC_TYPE_MAP[d.doc_type] || d.doc_type}
                </Badge>
                <Badge color={STATUS_COLORS[d.status] || '#888'}>
                  {DOC_STATUS_MAP[d.status] || d.status}
                </Badge>
                {d.accounting_type === 'internal' && (
                  <Badge color="#ff9800">внутр.</Badge>
                )}
              </div>
              <span style={{ fontSize: 11, color: colors.hint, whiteSpace: 'nowrap' }}>{fmtDate(d.doc_date)}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <span style={{ fontWeight: 500 }}>#{d.num}</span>
              <span style={{ color: colors.hint, marginLeft: 8, fontSize: 12 }}>{d.contractors?.name || ''}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {fmt(d.amount)} ₽
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

// ─── Create Draft ───
function CreateDraft({ onBack, onCreated }) {
  const [docType, setDocType] = useState('receipt')
  const [accType, setAccType] = useState('official')
  const [contractorId, setContractorId] = useState('')
  const [contractors, setContractors] = useState([])
  const [items, setItems] = useState([{ product_id: '', qty: '', price: '', unit: '' }])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('contractors').select('id, name').order('name').then(({ data }) => setContractors(data || []))
    supabase.from('products').select('id, name, cost, qty, unit').order('name').then(({ data }) => setProducts(data || []))
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(onBack)
    }
    return () => { if (tg?.BackButton) tg.BackButton.hide() }
  }, [onBack])

  const addItem = () => setItems([...items, { product_id: '', qty: '', price: '', unit: '' }])

  const selectProduct = (i, productId) => {
    const prod = products.find(p => String(p.id) === String(productId))
    const next = [...items]
    next[i] = {
      ...next[i],
      product_id: productId,
      price: prod ? String(prod.cost || '') : next[i].price,
      unit: prod ? (prod.unit || '') : next[i].unit,
    }
    setItems(next)
  }

  const updateItem = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    setItems(next)
  }

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!contractorId) { setError('Выберите контрагента'); return }
    const validItems = items.filter(it => it.product_id && it.qty)
    if (validItems.length === 0) { setError('Добавьте хотя бы одну позицию'); return }

    setSaving(true)
    setError(null)
    try {
      const totalSum = validItems.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0)
      const PREFIX = { receipt: 'ДОК', invoice: 'СЧ', torg12: 'ТН' }
      const num = (PREFIX[docType] || 'ДОК') + '-' + Date.now().toString().slice(-4)

      const contractor = contractors.find(c => String(c.id) === String(contractorId))
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          doc_type: docType,
          num,
          status: 'draft',
          posted: false,
          accounting_type: accType,
          contractor_id: Number(contractorId),
          contractor_name: contractor?.name || '',
          amount: totalSum,
          doc_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (docErr) throw docErr

      const docItems = validItems.map((it, idx) => {
        const prod = products.find(p => String(p.id) === String(it.product_id))
        const qty = Number(it.qty)
        const price = Number(it.price || 0)
        return {
          document_id: doc.id,
          product_id: Number(it.product_id),
          name: prod?.name || '',
          unit: prod?.unit || it.unit || '',
          qty,
          price,
          amount: qty * price,
          sort_order: idx + 1,
        }
      })

      const { error: itemsErr } = await supabase.from('document_items').insert(docItems)
      if (itemsErr) throw itemsErr

      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
      onCreated()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const createTypeOptions = [
    { value: 'receipt', label: 'Приходная' },
    { value: 'invoice', label: 'Счёт' },
    { value: 'torg12', label: 'ТОРГ-12' },
  ]

  const accOptions = [
    { value: 'official', label: 'Официальный' },
    { value: 'internal', label: 'Внутренний' },
  ]

  const selectStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.secondaryBg,
    color: colors.text,
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    marginBottom: 8,
    appearance: 'auto',
  }

  const inputStyle = { ...selectStyle, marginBottom: 0 }

  return (
    <div>
      <SectionTitle>Новый черновик</SectionTitle>

      <div style={{ marginBottom: 8, fontSize: 12, color: colors.hint }}>Тип документа</div>
      <FilterChips options={createTypeOptions} value={docType} onChange={setDocType} />

      <div style={{ marginBottom: 8, fontSize: 12, color: colors.hint }}>Контур</div>
      <FilterChips options={accOptions} value={accType} onChange={setAccType} />

      <div style={{ marginBottom: 8, fontSize: 12, color: colors.hint }}>Контрагент</div>
      <select value={contractorId} onChange={e => setContractorId(e.target.value)} style={selectStyle}>
        <option value="">— Выберите —</option>
        {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <SectionTitle>Позиции</SectionTitle>
      {items.map((it, i) => {
        const selProd = products.find(p => String(p.id) === String(it.product_id))
        return (
          <Card key={i}>
            <select
              value={it.product_id}
              onChange={e => selectProduct(i, e.target.value)}
              style={{ ...selectStyle, marginBottom: 6 }}
            >
              <option value="">— Товар —</option>
              {products.map(p => {
                const stock = Number(p.qty || 0)
                const label = `${p.name}${p.unit ? ` (${stock} ${p.unit})` : ` (${stock} шт)`}`
                return (
                  <option key={p.id} value={p.id} style={{ color: stock === 0 ? '#f44336' : 'inherit' }}>
                    {label}
                  </option>
                )
              })}
            </select>

            {selProd && Number(selProd.qty) === 0 && (
              <div style={{ fontSize: 11, color: '#f44336', marginBottom: 6 }}>
                Нет в наличии
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="number"
                placeholder="Кол-во"
                value={it.qty}
                onChange={e => updateItem(i, 'qty', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                placeholder="Цена"
                value={it.price}
                onChange={e => updateItem(i, 'price', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} style={{
                  padding: '10px 12px', borderRadius: 8, border: 'none',
                  background: '#f4433622', color: '#f44336', cursor: 'pointer', fontSize: 14,
                  flexShrink: 0,
                }}>×</button>
              )}
            </div>

            {it.qty && it.price && (
              <div style={{ fontSize: 11, color: colors.hint, marginTop: 6, textAlign: 'right' }}>
                Сумма: {fmt(Number(it.qty) * Number(it.price))} ₽
                {it.unit && <span style={{ marginLeft: 8 }}>ед.: {it.unit}</span>}
              </div>
            )}
          </Card>
        )
      })}

      <button onClick={addItem} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        border: `1px dashed ${colors.hint}`, background: 'transparent',
        color: colors.hint, fontSize: 13, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit',
      }}>
        + Добавить позицию
      </button>

      {error && <ErrorMsg msg={error} />}

      <button onClick={save} disabled={saving} style={{
        width: '100%', padding: '14px', borderRadius: 12,
        border: 'none', background: colors.button, color: colors.buttonText,
        fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit',
        opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Сохранение...' : 'Создать черновик'}
      </button>

      <div style={{
        marginTop: 12, padding: 12, borderRadius: 10,
        background: '#ff980022', fontSize: 12, color: '#ff9800', lineHeight: 1.5,
      }}>
        Проводка документов доступна только в SkySi Desktop
      </div>
    </div>
  )
}
