import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { fmt, fmtDate, fmtDateTime, DOC_TYPE_MAP, DOC_TYPE_COLORS, DOC_STATUS_MAP, STATUS_COLORS, ACCOUNTING_MAP, colors, tg } from '../utils'
import { Card, SectionTitle, Spinner, ErrorMsg, EmptyState } from './Card.jsx'
import { Badge } from './Badge.jsx'
import { toast } from './Toast.jsx'

export default function DocDetail({ docId, onBack, onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [baseDoc, setBaseDoc] = useState(null)
  const [childDocs, setChildDocs] = useState([])
  const [history, setHistory] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .select('*, contractors(name)')
        .eq('id', docId)
        .single()

      if (docErr) throw docErr
      setDoc(docData)

      const { data: itemsData } = await supabase
        .from('document_items')
        .select('*')
        .eq('document_id', docId)
        .order('id')
      setItems(itemsData || [])

      if (docData.base_document_id) {
        const { data: base } = await supabase
          .from('documents')
          .select('id, num, doc_type')
          .eq('id', docData.base_document_id)
          .single()
        setBaseDoc(base)
      } else {
        setBaseDoc(null)
      }

      const { data: children } = await supabase
        .from('documents')
        .select('id, num, doc_type, status')
        .eq('base_document_id', docId)
        .order('doc_date')
      setChildDocs(children || [])

      const { data: hist } = await supabase
        .from('document_history')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false })
      setHistory(hist || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const doLoad = async () => {
      await load()
    }
    doLoad()
    return () => { cancelled = true }
  }, [docId])

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      // Delete items first
      const { error: itemsErr } = await supabase
        .from('document_items')
        .delete()
        .eq('document_id', docId)
      if (itemsErr) throw itemsErr

      // Delete history
      await supabase
        .from('document_history')
        .delete()
        .eq('document_id', docId)

      // Delete document
      const { error: docErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)
      if (docErr) throw docErr

      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
      toast.success('Документ удалён')
      onBack()
    } catch (e) {
      toast.error(e.message)
    }
    setDeleting(false)
    setConfirmDelete(false)
  }

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />
  if (!doc) return <EmptyState text="Документ не найден" />

  const ACTION_MAP = {
    created: 'Создан',
    posted: 'Проведён',
    cancelled: 'Отмена',
    updated: 'Изменён',
  }

  const isDraft = doc.status === 'draft'

  return (
    <div>
      <div onClick={onBack} style={{
        fontSize: 13, color: colors.button, cursor: 'pointer', marginBottom: 12,
      }}>
        &larr; Назад к списку
      </div>

      {/* Header */}
      <Card>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <Badge color={DOC_TYPE_COLORS[doc.doc_type] || '#888'}>
            {DOC_TYPE_MAP[doc.doc_type] || doc.doc_type}
          </Badge>
          <Badge color={STATUS_COLORS[doc.status] || '#888'}>
            {DOC_STATUS_MAP[doc.status] || doc.status}
          </Badge>
          {doc.accounting_type && (
            <Badge color={doc.accounting_type === 'official' ? '#4caf50' : '#ff9800'}>
              {ACCOUNTING_MAP[doc.accounting_type]}
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          #{doc.num}
        </div>
        <div style={{ fontSize: 12, color: colors.hint, marginBottom: 4 }}>
          {fmtDate(doc.doc_date)}
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          {doc.contractors?.name || '—'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
          {fmt(doc.amount)} ₽
        </div>
      </Card>

      {/* Draft actions */}
      {isDraft && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 4 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600,
              background: confirmDelete ? '#f44336' : '#f4433622',
              color: confirmDelete ? '#fff' : '#f44336',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Удаление...' : confirmDelete ? 'Подтвердить удаление' : 'Удалить'}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '12px 20px', borderRadius: 10,
                border: `1px solid ${colors.border}`, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13,
                background: 'transparent', color: colors.hint,
              }}
            >
              Отмена
            </button>
          )}
        </div>
      )}

      {/* Base document link */}
      {baseDoc && (
        <>
          <SectionTitle>На основании</SectionTitle>
          <Card onClick={() => onNavigate(baseDoc.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge color={DOC_TYPE_COLORS[baseDoc.doc_type] || '#888'}>
                {DOC_TYPE_MAP[baseDoc.doc_type] || baseDoc.doc_type}
              </Badge>
              <span style={{ fontSize: 13, color: colors.button }}>#{baseDoc.num}</span>
            </div>
          </Card>
        </>
      )}

      {/* Child documents */}
      {childDocs.length > 0 && (
        <>
          <SectionTitle>Связанные документы</SectionTitle>
          {childDocs.map(cd => (
            <Card key={cd.id} onClick={() => onNavigate(cd.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge color={DOC_TYPE_COLORS[cd.doc_type] || '#888'}>
                  {DOC_TYPE_MAP[cd.doc_type] || cd.doc_type}
                </Badge>
                <span style={{ fontSize: 13, color: colors.button }}>#{cd.num}</span>
                <Badge color={STATUS_COLORS[cd.status] || '#888'}>
                  {DOC_STATUS_MAP[cd.status] || cd.status}
                </Badge>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Items */}
      <SectionTitle>Позиции ({items.length})</SectionTitle>
      {items.length === 0 ? (
        <EmptyState text="Нет позиций" />
      ) : (
        <>
          {items.map((it, i) => (
            <Card key={it.id || i}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {it.name || `Позиция ${i + 1}`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.hint }}>
                <span>{it.qty} {it.unit ? it.unit + ' x ' : 'x '}{fmt(it.price)}</span>
                <span style={{ fontWeight: 600, color: colors.text }}>{fmt(it.amount)} ₽</span>
              </div>
            </Card>
          ))}
          <Card style={{ background: 'transparent', border: 'none', padding: '4px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
              <span>Итого:</span>
              <span>{fmt(doc.amount)} ₽</span>
            </div>
          </Card>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <SectionTitle>История</SectionTitle>
          <div style={{
            borderLeft: `2px solid ${colors.border}`,
            marginLeft: 8,
            paddingLeft: 16,
          }}>
            {history.map((h, i) => (
              <div key={h.id || i} style={{ marginBottom: 12, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: -22, top: 4,
                  width: 10, height: 10, borderRadius: '50%',
                  background: i === 0 ? colors.button : colors.hint,
                }} />
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {ACTION_MAP[h.action] || h.action}
                </div>
                <div style={{ fontSize: 11, color: colors.hint }}>
                  {fmtDateTime(h.created_at)}
                  {h.user_name && ` — ${h.user_name}`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
