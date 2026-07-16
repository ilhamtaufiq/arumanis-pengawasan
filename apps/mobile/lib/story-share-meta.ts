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
  /** Opsional — mis. nama paket di bawah judul kegiatan */
  subtitle?: string | null
  locationLine: string
  outputLine: string
  slotLine: string
  penerimaLine: string | null
  pengawasLine: string | null
  koordinatLine: string
  tanggalLine: string
  brandLine: string
  badge: string
  /** default = kuning neobrutalism; ams = biru logo Bidang AMS */
  theme?: 'default' | 'ams'
  /** Override label baris slot (default SLOT) */
  slotLabel?: string
  /** Override label baris penerima (default PENERIMA) */
  penerimaLabel?: string
  /**
   * Teks bebas di bawah pill kegiatan (theme ams).
   * Kosong/null = baris tidak digambar.
   */
  keteranganLine?: string | null
}

/**
 * Meta bingkai story untuk foto tab detail pekerjaan.
 * Layout diselaraskan dengan kegiatan lapangan (theme AMS):
 * - pill progress/slot
 * - keterangan di bawah pill (penerima / catatan) hanya jika ada
 * - foto besar, logo Arumanis + Bidang AMS + @bidang_ams
 */
export function buildStoryShareMeta(foto: Foto, context: StoryShareContext): StoryShareMeta {
  const desa = context.desa?.trim() || ''
  const kecamatan = context.kecamatan?.trim() || ''
  const locationParts = [desa, kecamatan].filter(Boolean)
  const outputRaw =
    foto.komponen?.komponen?.trim() ||
    (foto.komponen_id != null ? `Output #${foto.komponen_id}` : '')
  const output = outputRaw || '-'

  const ketParts = String(foto.keterangan || '0%')
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
  const slot = ketParts[0] || '0%'
  const catatan = ketParts.slice(1).join(' · ') || null
  const penerima = foto.penerima?.nama?.trim() || null
  const pengawas = context.pengawas?.trim() || null
  const year = context.tahunAnggaran != null ? String(context.tahunAnggaran) : null
  const namaPaket = context.namaPaket?.trim() || 'Pekerjaan'

  // Di bawah pill: penerima dan/atau catatan bebas — kosong = tidak digambar
  const keteranganParts = [penerima, catatan].filter(Boolean)
  const keteranganLine = keteranganParts.length ? keteranganParts.join(' · ') : null

  return {
    // Judul utama = nama paket (seperti subtitle paket di kegiatan lapangan)
    title: namaPaket,
    // Subtitle = output (jika ada)
    subtitle: outputRaw && outputRaw !== '-' ? outputRaw : null,
    locationLine: locationParts.length ? locationParts.join(' · ') : 'Lokasi belum diisi',
    outputLine: output,
    slotLine: slot,
    penerimaLine: null,
    pengawasLine: pengawas,
    koordinatLine: foto.koordinat?.trim() || 'Koordinat tidak tersedia',
    tanggalLine: formatDateTime(foto.created_at) || '-',
    brandLine: year
      ? `ARUMANIS · Pengawasan · TA ${year}`
      : 'ARUMANIS · Pengawasan Lapangan',
    /** Pill = slot progress foto (0% / 25% / …) */
    badge: `SLOT ${slot}`.toUpperCase(),
    theme: 'ams',
    slotLabel: 'SLOT',
    keteranganLine,
  }
}
