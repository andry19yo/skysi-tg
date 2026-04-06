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

const thStyle = {
  padding: '6px 8px', fontSize: 10, fontWeight: 600,
  color: colors.hint, textTransform: 'uppercase',
  letterSpacing: '0.3px', textAlign: 'left', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap',
  color: colors.text,
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

      {/* Settlements table */}
      {settlements.length > 0 && (
        <>
          <SectionTitle>Взаиморасчёты</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: colors.secondaryBg }}>
                    <th style={thStyle}>Дата</th>
                    <th style={thStyle}>Документ</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Дебет</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Кредит</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Баланс</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Calculate running balance (settlements are desc, reverse for calc)
                    const sorted = [...settlements].reverse()
                    let running = 0
                    const rows = sorted.map(s => {
                      const d = Number(s.debit || 0)
                      const c = Number(s.credit || 0)
                      running += d - c
                      return { ...s, _debit: d, _credit: c, _balance: running }
                    })
                    rows.reverse() // back to desc
                    return rows.map(s => (
                      <tr key={s.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={tdStyle}>{fmtDate(s.reg_date)}</td>
                        <td style={tdStyle}>
                          {s.doc_type ? (DOC_TYPE_MAP[s.doc_type] || s.doc_type) : '—'} {s.doc_num || ''}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: s._debit > 0 ? '#ff9800' : colors.hint }}>
                          {s._debit > 0 ? fmt(s._debit) : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: s._credit > 0 ? '#4caf50' : colors.hint }}>
                          {s._credit > 0 ? fmt(s._credit) : '—'}
                        </td>
                        <td style={{
                          ...tdStyle, textAlign: 'right', fontWeight: 600,
                          color: s._balance > 0 ? '#ff9800' : s._balance < 0 ? '#4caf50' : colors.hint,
                        }}>
                          {fmt(s._balance)}
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${colors.border}`, background: colors.secondaryBg }}>
                    <td colSpan={2} style={{ ...tdStyle, fontWeight: 600 }}>Итого</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#ff9800' }}>
                      {fmt(settlements.reduce((s, r) => s + Number(r.debit || 0), 0))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#4caf50' }}>
                      {fmt(settlements.reduce((s, r) => s + Number(r.credit || 0), 0))}
                    </td>
                    <td style={{
                      ...tdStyle, textAlign: 'right', fontWeight: 700,
                      color: balance > 0 ? '#ff9800' : balance < 0 ? '#4caf50' : colors.hint,
                    }}>
                      {fmt(balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
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
