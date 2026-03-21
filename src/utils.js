export const tg = window.Telegram?.WebApp
export const tp = tg?.themeParams || {}

export const fmt = (n) =>
  Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtInt = (n) =>
  Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })

export const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export const DOC_TYPE_MAP = {
  receipt: 'Приходная',
  invoice: 'Счёт',
  torg12: 'ТОРГ-12',
  payment: 'Оплата',
  return: 'Возврат',
  act: 'Акт',
  contract: 'Договор',
  sf: 'Счёт-фактура',
  'отгрузка': 'Отгрузка',
}

export const DOC_STATUS_MAP = {
  draft: 'Черновик',
  posted: 'Проведён',
  cancelled: 'Отклонён',
}

export const ACCOUNTING_MAP = {
  official: 'Официальный',
  internal: 'Внутренний',
}

export const DOC_TYPE_COLORS = {
  receipt: '#4caf50',
  invoice: '#2196f3',
  torg12: '#ff9800',
  payment: '#9c27b0',
  return: '#f44336',
  act: '#00bcd4',
  contract: '#795548',
  sf: '#607d8b',
  'отгрузка': '#ff5722',
}

export const STATUS_COLORS = {
  draft: '#888',
  posted: '#4caf50',
  cancelled: '#f44336',
}

export const colors = {
  bg: tp.bg_color || '#1a1a1a',
  secondaryBg: tp.secondary_bg_color || '#1c1c1c',
  text: tp.text_color || '#ffffff',
  hint: tp.hint_color || '#888888',
  button: tp.button_color || '#2196f3',
  buttonText: tp.button_text_color || '#ffffff',
  link: tp.link_color || '#2196f3',
  border: 'rgba(255,255,255,0.06)',
}
