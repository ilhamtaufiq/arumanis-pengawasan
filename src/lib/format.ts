const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const compactFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('id-ID')

export function formatCurrency(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  return rupiahFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatNumber(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  return numberFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatCompactNumber(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  return compactFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatPercent(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  return `${Number.isFinite(numeric) ? numeric.toFixed(1) : '0.0'}%`
}

export function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function progressTone(value?: number | string | null) {
  const numeric = Number(value ?? 0)

  if (!Number.isFinite(numeric) || numeric < 50) return 'danger'
  if (numeric < 80) return 'warning'
  return 'success'
}

