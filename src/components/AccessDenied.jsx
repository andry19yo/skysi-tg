import React, { useState } from 'react'
import { colors, tg } from '../utils'

export default function AccessDenied({ telegramId, blocked }) {
  const [copied, setCopied] = useState(false)

  const copyId = () => {
    if (telegramId) {
      navigator.clipboard.writeText(String(telegramId)).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
      })
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 32,
      background: colors.bg,
      color: colors.text,
      textAlign: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{blocked ? '🚫' : '🔒'}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {blocked ? 'Доступ заблокирован' : 'Доступ запрещён'}
      </div>
      <div style={{ fontSize: 13, color: colors.hint, marginBottom: 24, lineHeight: 1.5 }}>
        {blocked
          ? 'Ваш аккаунт деактивирован. Обратитесь к администратору.'
          : 'Ваш Telegram ID не найден в системе. Отправьте его администратору для получения доступа.'}
      </div>
      {telegramId && !blocked && (
        <>
          <div style={{
            fontSize: 13,
            color: colors.hint,
            marginBottom: 8,
          }}>
            Ваш Telegram ID:
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            fontFamily: 'monospace',
            color: colors.button,
          }}>
            {telegramId}
          </div>
          <button
            onClick={copyId}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: colors.button,
              color: colors.buttonText,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: 16,
            }}
          >
            {copied ? 'Скопировано!' : 'Скопировать ID'}
          </button>
          <div style={{ fontSize: 12, color: colors.hint }}>
            Отправьте администратору: <b>@andry054</b>
          </div>
        </>
      )}
    </div>
  )
}
