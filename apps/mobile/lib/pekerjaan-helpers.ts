import type { Foto, Output, Penerima, ProgressItem } from '@pengawas/shared'

export const FOTO_SLOTS = ['0%', '25%', '50%', '75%', '100%'] as const

export type DetailTabId = 'ringkasan' | 'output' | 'penerima' | 'foto' | 'progress' | 'tiket'

export const DETAIL_TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'output', label: 'Output' },
  { id: 'penerima', label: 'Penerima' },
  { id: 'foto', label: 'Foto' },
  { id: 'progress', label: 'Progress' },
  { id: 'tiket', label: 'Tiket' },
]

export function normalizeSlotLabel(value?: string | null) {
  const text = `${value ?? ''}`.trim()
  if (!text) return ''
  if (FOTO_SLOTS.includes(text as (typeof FOTO_SLOTS)[number])) return text
  const numeric = Number(text.replace('%', ''))
  if (Number.isFinite(numeric)) return `${numeric}%`
  return text
}

export function pickText(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = `${value}`.trim()
    if (text) return text
  }
  return '-'
}

export function buildProgressItemPayload(
  item: ProgressItem,
  index: number,
  editedProgress: Record<string, { rencana?: string; realisasi?: string }>,
  activeWeek: number,
) {
  const edits = editedProgress[`${index}`]
  const weekData = { ...(item.weekly_data ?? {}) }
  const weekKey = String(activeWeek)
  const existing = weekData[weekKey] ?? {}
  weekData[weekKey] = {
    rencana: edits?.rencana !== undefined ? parseFloat(edits.rencana) || null : existing.rencana ?? null,
    realisasi: edits?.realisasi !== undefined ? parseFloat(edits.realisasi) || null : existing.realisasi ?? null,
  }
  return {
    nama_item: item.nama_item,
    rincian_item: item.rincian_item,
    satuan: item.satuan,
    harga_satuan: item.harga_satuan,
    bobot: item.bobot,
    target_volume: item.target_volume,
    weekly_data: weekData,
  }
}

export function buildProgressItemsPayload(
  items: ProgressItem[],
  editedProgress: Record<string, { rencana?: string; realisasi?: string }>,
  activeWeek: number,
) {
  return items.map((item, index) => buildProgressItemPayload(item, index, editedProgress, activeWeek))
}

export type FotoMatrixRow = {
  output: Output
  slots: Array<{ slot: string; foto?: Foto }>
  penerima?: Penerima
  count: number
}

export function buildFotoMatrix(outputs: Output[], fotos: Foto[], penerimaList: Penerima[]): FotoMatrixRow[] {
  const matrix: FotoMatrixRow[] = []

  outputs.forEach((output) => {
    if (output.penerima_is_optional) {
      const slots = FOTO_SLOTS.map((slot) => ({
        slot,
        foto: fotos.find(
          (item) => item.komponen_id === output.id && normalizeSlotLabel(item.keterangan) === slot && !item.penerima_id,
        ),
      }))
      matrix.push({
        output,
        slots,
        count: fotos.filter((item) => item.komponen_id === output.id && !item.penerima_id).length,
      })
      return
    }

    if (penerimaList.length === 0) {
      const slots = FOTO_SLOTS.map((slot) => ({
        slot,
        foto: fotos.find(
          (item) => item.komponen_id === output.id && normalizeSlotLabel(item.keterangan) === slot && !item.penerima_id,
        ),
      }))
      matrix.push({
        output,
        slots,
        count: fotos.filter((item) => item.komponen_id === output.id && !item.penerima_id).length,
      })
      return
    }

    penerimaList.forEach((penerima) => {
      const slots = FOTO_SLOTS.map((slot) => ({
        slot,
        foto: fotos.find(
          (item) =>
            item.komponen_id === output.id &&
            item.penerima_id === penerima.id &&
            normalizeSlotLabel(item.keterangan) === slot,
        ),
      }))
      matrix.push({
        output,
        slots,
        penerima,
        count: fotos.filter((item) => item.komponen_id === output.id && item.penerima_id === penerima.id).length,
      })
    })
  })

  return matrix
}