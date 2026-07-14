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

export function fotoMatrixKey(komponenId: number, penerimaId: number | null | undefined, slot: string) {
  return `${komponenId}:${penerimaId ?? 0}:${slot}`
}

function fotoCountKey(komponenId: number, penerimaId: number | null | undefined) {
  return `${komponenId}:${penerimaId ?? 0}`
}

/** Index foto per slot — O(fotos), tanpa meledak ke outputs×penerima. */
export function buildFotoSlotLookup(fotos: Foto[]): Map<string, Foto> {
  const bySlot = new Map<string, Foto>()
  for (const foto of fotos) {
    const komponenId = foto.komponen_id
    if (komponenId == null) continue
    const penerimaId = foto.penerima_id ?? null
    const rawSlot = normalizeSlotLabel(foto.keterangan)
    const slot = rawSlot.includes('|') ? (rawSlot.split('|')[0] ?? '').trim() || rawSlot : rawSlot
    if (!slot) continue
    const key = fotoMatrixKey(komponenId, penerimaId, slot)
    if (!bySlot.has(key)) bySlot.set(key, foto)
  }
  return bySlot
}

export function slotsForGroup(
  lookup: Map<string, Foto>,
  outputId: number,
  penerimaId: number | null = null,
): Array<{ slot: string; foto?: Foto }> {
  return FOTO_SLOTS.map((slot) => ({
    slot,
    foto: lookup.get(fotoMatrixKey(outputId, penerimaId, slot)),
  }))
}

export function countFilledSlots(
  lookup: Map<string, Foto>,
  outputId: number,
  penerimaId: number | null = null,
): number {
  let n = 0
  for (const slot of FOTO_SLOTS) {
    if (lookup.has(fotoMatrixKey(outputId, penerimaId, slot))) n += 1
  }
  return n
}

export type OutputFotoSummary = {
  output: Output
  isUnit: boolean
  filled: number
  total: number
  groupCount: number
}

/** Ringkasan per output — murah untuk list level-1. */
export function buildOutputFotoSummaries(
  outputs: Output[],
  lookup: Map<string, Foto>,
  penerimaList: Penerima[],
): OutputFotoSummary[] {
  return outputs.map((output) => {
    const isUnit = !output.penerima_is_optional && penerimaList.length > 0
    if (!isUnit) {
      const filled = countFilledSlots(lookup, output.id, null)
      return { output, isUnit: false, filled, total: FOTO_SLOTS.length, groupCount: 1 }
    }
    let filled = 0
    for (const p of penerimaList) {
      filled += countFilledSlots(lookup, output.id, p.id)
    }
    return {
      output,
      isUnit: true,
      filled,
      total: FOTO_SLOTS.length * penerimaList.length,
      groupCount: penerimaList.length,
    }
  })
}

/**
 * Bangun matriks foto O(fotos + outputs × penerima × slots) dengan lookup map,
 * bukan O(outputs × penerima × slots × fotos) via Array.find berulang.
 * @deprecated Prefer buildFotoSlotLookup + slotsForGroup untuk UI mobile (anti-lag).
 */
export function buildFotoMatrix(outputs: Output[], fotos: Foto[], penerimaList: Penerima[]): FotoMatrixRow[] {
  const bySlot = buildFotoSlotLookup(fotos)
  const counts = new Map<string, number>()

  for (const foto of fotos) {
    const komponenId = foto.komponen_id
    if (komponenId == null) continue
    const cKey = fotoCountKey(komponenId, foto.penerima_id ?? null)
    counts.set(cKey, (counts.get(cKey) ?? 0) + 1)
  }

  const matrix: FotoMatrixRow[] = []

  for (const output of outputs) {
    if (output.penerima_is_optional || penerimaList.length === 0) {
      const slots = slotsForGroup(bySlot, output.id, null)
      matrix.push({
        output,
        slots,
        count: counts.get(fotoCountKey(output.id, null)) ?? 0,
      })
      continue
    }

    for (const penerima of penerimaList) {
      const slots = slotsForGroup(bySlot, output.id, penerima.id)
      matrix.push({
        output,
        slots,
        penerima,
        count: counts.get(fotoCountKey(output.id, penerima.id)) ?? 0,
      })
    }
  }

  return matrix
}