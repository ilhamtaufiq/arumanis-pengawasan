import type { Foto } from '@pengawas/shared'
import { formatDateTime } from '@pengawas/shared/format'

/** Instagram / WhatsApp story aspect 9:16 — export target. */
export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920
/** Preview scale on device (logical px). Capture multiplies by pixelRatio. */
export const STORY_PREVIEW_WIDTH = 320
export const STORY_PREVIEW_HEIGHT = Math.round((STORY_PREVIEW_WIDTH * STORY_HEIGHT) / STORY_WIDTH)

export type StoryShareContext = {
  namaPaket: string
  desa?: string | null
  kecamatan?: string | null
  pengawas?: string | null
  tahunAnggaran?: string | number | null
}

export type StoryShareMeta = {
  title: string
  locationLine: string
  outputLine: string
  slotLine: string
  penerimaLine: string | null
  pengawasLine: string | null
  koordinatLine: string
  tanggalLine: string
  brandLine: string
  badge: string
}

export function buildStoryShareMeta(foto: Foto, context: StoryShareContext): StoryShareMeta {
  const desa = context.desa?.trim() || ''
  const kecamatan = context.kecamatan?.trim() || ''
  const locationParts = [desa, kecamatan].filter(Boolean)
  const output =
    foto.komponen?.komponen?.trim() ||
    (foto.komponen_id != null ? `Output #${foto.komponen_id}` : '-')
  const slot = (foto.keterangan || '0%').split('|')[0]?.trim() || '0%'
  const penerima = foto.penerima?.nama?.trim() || null
  const pengawas = context.pengawas?.trim() || null
  const year = context.tahunAnggaran != null ? String(context.tahunAnggaran) : null

  return {
    title: context.namaPaket?.trim() || 'Pekerjaan',
    locationLine: locationParts.length ? locationParts.join(' · ') : 'Lokasi belum diisi',
    outputLine: output,
    slotLine: slot,
    penerimaLine: penerima,
    pengawasLine: pengawas,
    koordinatLine: foto.koordinat?.trim() || 'Koordinat tidak tersedia',
    tanggalLine: formatDateTime(foto.created_at) || '-',
    brandLine: year
      ? `ARUMANIS · Pengawasan · TA ${year}`
      : 'ARUMANIS · Pengawasan Lapangan',
    badge: 'DOKUMENTASI LAPANGAN',
  }
}
