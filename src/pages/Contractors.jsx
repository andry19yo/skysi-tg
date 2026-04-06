import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, DOC_TYPE_MAP, DOC_TYPE_COLORS, colors, tg } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState, SearchInput } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

export default function Contractors() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contractors, setContractors] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('contractors')
        .select('id, name, inn, phone, email, balance')
        .order('name')
      if (err) throw err
      setContractors(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openDetail = useCallback((c) => {
    setSelected(c)
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(() => { setSelected(null); tg.BackButton.hide() })
    }
  }, [])

  const closeDetail = useCallback(() => {
    setSelected(null)
    if (tg?.BackButton) tg.BackButton.hide()
  }, [])

  if (selected) return <ContractorDetail contractor={selected} onBack={closeDetail} />
  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const filtered = search
    ? contractors.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.inn?.includes(search)
      )
    : contractors

  return (
    <div>
      <SectionTitle>Контрагенты ({filtered.length})</SectionTitle>
      <SearchInput value={search} onChange={setSearch} placeholder="Имя или ИНН..." />

      {filtered.length === 0 ? (
        <EmptyState text="Контрагенты не найдены" />
      ) : (
        filtered.map(c => {
          const bal = Number(c.balance || 0)
          return (
            <Card key={c.id} onClick={() => openDetail(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  {c.inn && <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>ИНН: {c.inn}</div>}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: bal > 0 ? '#ff9800' : bal < 0 ? '#f44336' : colors.hint,
                }}>
                  {bal !== 0 ? fmt(bal) + ' ₽' : '—'}
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}

function ContractorDetail({ contractor, onBack }) {
  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])
  const [recentDocs, setRecentDocs] = useState([])
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Settlement balance
        const { data: sr } = await supabase
          .from('settlement_register')
          .select('debit, credit')
          .eq('contractor_id', contractor.id)

        let bal = 0
        for (const r of (sr || [])) {
          bal += Number(r.debit || 0) - Number(r.credit || 0)
        }
        setBalance(bal)

        // Recent settlements
        const { data: settl } = await supabase
          .from('settlement_register')
          .select('id, reg_date, debit, credit, doc_type, doc_num')
          .eq('contractor_id', contractor.id)
          .order('reg_date', { ascending: false })
          .limit(20)
        setSettlements(settl || [])

        // Recent documents
        const { data: docs } = await supabase
          .from('documents')
          .select('id, num, doc_type, doc_date, amount, status')
          .eq('contractor_id', contractor.id)
          .order('doc_date', { ascending: false })
          .limit(10)
        setRecentDocs(docs || [])
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [contractor.id])

  if (loading) return <Spinner />

  return (
    <div>
      <div onClick={onBack} style={{
        fontSize: 13, color: colors.button, cursor: 'pointer', marginBottom: 12,
      }}>
        &larr; Назад
      </div>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{contractor.name}</div>
        {contractor.inn && <div style={{ fontSize: 12, color: colors.hint }}>ИНН: {contractor.inn}</div>}
        {contractor.phone && <div style={{ fontSize: 12, color: colors.hint, marginTop: 2 }}>{contractor.phone}</div>}
        {contractor.email && <div style={{ fontSize: 12, color: colors.hint, marginTop: 2 }}>{contractor.email}</div>}

        <div style={{
          fontSize: 20, fontWeight: 600, marginTop: 12,
          color: balance > 0 ? '#ff9800' : balance < 0 ? '#4caf50' : colors.hint,
        }}>
          {balance > 0 ? `Долг: ${fmt(balance)} ₽` : balance < 0 ? `Переплата: ${fmt(Math.abs(balance))} ₽` : 'Баланс: 0'}
        </div>
        <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>
          {balance > 0 ? 'Контрагент должен вам' : balance < 0 ? 'Вы должны контрагенту' : 'Расчёты сведены'}
        </div>
      </Card>

      {/* Settlements */}
      {settlements.length > 0 && (
        <>
          <SectionTitle>Взаиморасчёты</SectionTitle>
          {settlements.map(s => {
            const debit = Number(s.debit || 0)
            const credit = Number(s.credit || 0)
            const isDebit = debit > 0
            return (
              <Card key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12 }}>{s.doc_type ? (DOC_TYPE_MAP[s.doc_type] || s.doc_type) : '—'} {s.doc_num || ''}</div>
                    <div style={{ fontSize: 11, color: colors.hint }}>{fmtDate(s.reg_date)}</div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: isDebit ? '#ff9800' : '#4caf50',
                  }}>
                    {isDebit ? `+${fmt(debit)}` : `-${fmt(credit)}`} ₽
                  </div>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {/* Recent documents */}
      {recentDocs.length > 0 && (
        <>
          <SectionTitle>Документы</SectionTitle>
          {recentDocs.map(d => (
            <Card key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge color={DOC_TYPE_COLORS[d.doc_type] || '#888'}>
                    {DOC_TYPE_MAP[d.doc_type] || d.doc_type}
                  </Badge>
                  <span style={{ fontSize: 12 }}>#{d.num}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(d.amount)} ₽</span>
              </div>
              <div style={{ fontSize: 11, color: colors.hint, marginTop: 4 }}>{fmtDate(d.doc_date)}</div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
