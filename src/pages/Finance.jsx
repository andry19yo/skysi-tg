import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDateTime, ACCOUNTING_MAP, colors } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState, FilterChips } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'

export default function Finance() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: acc, error: e1 } = await supabase
        .from('financial_accounts')
        .select('*')
        .order('name')

      if (e1) throw e1
      setAccounts(acc || [])

      const { data: txn, error: e2 } = await supabase
        .from('transactions')
        .select('*, financial_accounts(name)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (e2) throw e2
      setTransactions(txn || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const accountOptions = [
    { value: 'all', label: 'Все счета' },
    ...accounts.map(a => ({ value: String(a.id), label: a.name })),
  ]

  const typeOptions = [
    { value: 'all', label: 'Все' },
    { value: 'income', label: 'Приход' },
    { value: 'expense', label: 'Расход' },
  ]

  let filteredTxn = transactions
  if (filterAccount !== 'all') {
    filteredTxn = filteredTxn.filter(t => String(t.account_id) === filterAccount)
  }
  if (filterType === 'income') {
    filteredTxn = filteredTxn.filter(t => Number(t.amount) > 0)
  } else if (filterType === 'expense') {
    filteredTxn = filteredTxn.filter(t => Number(t.amount) < 0)
  }

  return (
    <div>
      <SectionTitle>Счета</SectionTitle>
      {accounts.map(a => (
        <Card key={a.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
              <Badge color={a.accounting_type === 'official' ? '#4caf50' : '#ff9800'} style={{ marginTop: 4 }}>
                {ACCOUNTING_MAP[a.accounting_type] || a.accounting_type || '—'}
              </Badge>
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: Number(a.balance) >= 0 ? '#4caf50' : '#f44336',
            }}>
              {fmt(a.balance)} ₽
            </div>
          </div>
        </Card>
      ))}

      <SectionTitle>Транзакции</SectionTitle>
      <FilterChips options={typeOptions} value={filterType} onChange={setFilterType} />
      {accounts.length > 2 && (
        <FilterChips options={accountOptions} value={filterAccount} onChange={setFilterAccount} />
      )}

      {filteredTxn.length === 0 ? (
        <EmptyState text="Нет транзакций" />
      ) : (
        filteredTxn.map(t => {
          const amt = Number(t.amount || 0)
          const isIncome = amt > 0
          return (
            <Card key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{t.description || t.financial_accounts?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>
                    {t.financial_accounts?.name} &middot; {fmtDateTime(t.created_at)}
                  </div>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isIncome ? '#4caf50' : '#f44336',
                  whiteSpace: 'nowrap',
                  marginLeft: 8,
                }}>
                  {isIncome ? '+' : ''}{fmt(amt)} ₽
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
