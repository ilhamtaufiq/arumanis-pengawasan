import type { ProgressEstimasiSection, ProgressHistoryEntry } from '@pengawas/shared'

export type HistoryDraft = { tanggal: string; persen: string }

export type SectionHistories = {
  rencana: ProgressHistoryEntry[]
  realisasi: ProgressHistoryEntry[]
}

export type FormHistories = {
  fisik: SectionHistories
  keuangan: SectionHistories
}

export type ProgressJenis = 'fisik' | 'keuangan'

export const emptyDraft = (): HistoryDraft => ({ tanggal: '', persen: '' })

export function historiesFromResponse(data: {
  fisik: ProgressEstimasiSection
  keuangan: ProgressEstimasiSection
}): FormHistories {
  return {
    fisik: { rencana: data.fisik.rencana, realisasi: data.fisik.realisasi },
    keuangan: { rencana: data.keuangan.rencana, realisasi: data.keuangan.realisasi },
  }
}

export function sanitizePercentInput(value: string) {
  let sanitized = value.replace(/[^0-9,.]/g, '')
  const separatorIndex = sanitized.search(/[,.]/)

  if (separatorIndex !== -1) {
    const before = sanitized.slice(0, separatorIndex)
    const separator = sanitized[separatorIndex]
    const after = sanitized.slice(separatorIndex + 1).replace(/[,.]/g, '')
    sanitized = `${before}${separator}${after}`
  }

  return sanitized
}

export function parsePercent(value: string): number | null {
  const normalized = value.replace(',', '.').trim()
  if (normalized === '') return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatPercentValue(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function sortEntries(entries: ProgressHistoryEntry[]) {
  return [...entries].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.id ?? 0) - (b.id ?? 0))
}

export const emptyProgressSection: ProgressEstimasiSection = {
  rencana: [],
  realisasi: [],
  latest_rencana: null,
  latest_realisasi: null,
  deviasi: null,
}