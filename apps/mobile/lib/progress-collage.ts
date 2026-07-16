/**
 * Kolase share progress foto 0% → 100% (story 9:16 AMS).
 */
import type { Foto, Output, Penerima } from '@pengawas/shared'
import { FOTO_SLOTS } from '@/lib/pekerjaan-helpers'
import type { StoryShareContext, StoryShareMeta } from '@/lib/story-share-meta'

export type CollageSlotItem = {
  slot: (typeof FOTO_SLOTS)[number] | string
  foto?: Foto
  /** URI terbaik untuk render (full > thumb) */
  imageUri: string | null
}

export type ProgressCollageInput = {
  slots: Array<{ slot: string; foto?: Foto }>
  output: Output
  penerima?: Penerima | null
  context: StoryShareContext
}

export function resolveFotoImageUri(foto?: Foto | null): string | null {
  if (!foto) return null
  const full = foto.foto_url?.trim()
  if (full) return full
  const thumb = foto.foto_thumb_url?.trim()
  if (thumb) return thumb
  return null
}

export function buildCollageSlots(
  slots: Array<{ slot: string; foto?: Foto }>,
): CollageSlotItem[] {
  const bySlot = new Map(slots.map((s) => [s.slot, s.foto]))
  return FOTO_SLOTS.map((slot) => {
    const foto = bySlot.get(slot)
    return {
      slot,
      foto,
      imageUri: resolveFotoImageUri(foto),
    }
  })
}

export function countCollageFilled(items: CollageSlotItem[]): number {
  return items.filter((s) => Boolean(s.imageUri)).length
}

/** Meta header/footer story — badge PROGRESS, tanpa single-foto. */
export function buildProgressCollageMeta(input: ProgressCollageInput): StoryShareMeta {
  const { context, output, penerima } = input
  const items = buildCollageSlots(input.slots)
  const filled = countCollageFilled(items)
  const desa = context.desa?.trim() || ''
  const kecamatan = context.kecamatan?.trim() || ''
  const locationParts = [desa, kecamatan].filter(Boolean)
  const year = context.tahunAnggaran != null ? String(context.tahunAnggaran) : null
  const namaPaket = context.namaPaket?.trim() || 'Pekerjaan'
  const outputName = output.komponen?.trim() || `Output #${output.id}`
  const penerimaName = penerima?.nama?.trim() || null

  return {
    title: namaPaket,
    subtitle: outputName,
    locationLine: locationParts.length ? locationParts.join(' · ') : 'Lokasi belum diisi',
    outputLine: outputName,
    slotLine: `${filled}/${FOTO_SLOTS.length}`,
    penerimaLine: null,
    pengawasLine: context.pengawas?.trim() || null,
    koordinatLine: '',
    tanggalLine: '',
    brandLine: year
      ? `ARUMANIS · Pengawasan · TA ${year}`
      : 'ARUMANIS · Pengawasan Lapangan',
    badge: 'PROGRESS 0–100%',
    theme: 'ams',
    slotLabel: 'SLOT',
    keteranganLine: penerimaName
      ? `Penerima: ${penerimaName} · ${filled}/${FOTO_SLOTS.length} foto`
      : `${filled}/${FOTO_SLOTS.length} slot terisi`,
  }
}

export function buildProgressCollageCaption(input: {
  meta: StoryShareMeta
  filled: number
  total?: number
}): string {
  const total = input.total ?? FOTO_SLOTS.length
  const lines = [
    input.meta.badge,
    input.meta.title,
    input.meta.subtitle ? `Output: ${input.meta.subtitle}` : null,
    input.meta.keteranganLine,
    input.meta.locationLine,
    `Slot: ${input.filled}/${total} (0% · 25% · 50% · 75% · 100%)`,
    input.meta.pengawasLine ? `Pengawas: ${input.meta.pengawasLine}` : null,
    '@bidang_ams · Bidang Air Minum dan Sanitasi',
    'ARUMANIS · Pengawasan Lapangan',
  ]
  return lines
    .map((l) => (l ?? '').trim())
    .filter(Boolean)
    .join('\n')
}
