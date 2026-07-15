import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PekerjaanDetail } from '@pengawas/shared'
import { formatDateTime } from '@pengawas/shared/format'
import type { StoryShareMeta } from './story-share-meta'

const STORAGE_KEY = 'pengawas.kegiatan-lapangan.drafts.v1'

export type KegiatanLapanganDraft = {
  id: string
  createdAt: string
  updatedAt: string
  photoUri: string
  /** Nama kegiatan lapangan (input user) — mis. Monitoring dan Evaluasi, PHO */
  namaKegiatan: string
  /** Keterangan bebas (opsional) */
  keterangan?: string | null
  pekerjaanId: number
  namaPaket: string
  desa?: string | null
  kecamatan?: string | null
  /** Ringkasan output (komponen) */
  outputLine?: string | null
  /** Outcome / nama kegiatan program dari paket */
  outcomeLine?: string | null
  pengawas?: string | null
  tahunAnggaran?: string | number | null
  koordinat?: string | null
  caption: string
}

export type KegiatanPekerjaanContext = {
  pekerjaanId: number
  namaPaket: string
  desa?: string | null
  kecamatan?: string | null
  outputLine?: string | null
  outcomeLine?: string | null
  pengawas?: string | null
  tahunAnggaran?: string | number | null
}

function newId(): string {
  return `kl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Format output + volume + satuan ringkas: "SR 10 unit · IPA 5 unit" */
export function formatOutputWithVolume(
  outputs: Array<{ komponen?: string | null; volume?: string | number | null; satuan?: string | null }>,
): string | null {
  const parts = outputs
    .map((o) => {
      const name = o.komponen?.trim()
      if (!name) return null
      const volRaw = o.volume
      const vol =
        volRaw != null && String(volRaw).trim() !== '' && String(volRaw) !== 'null'
          ? String(volRaw).trim()
          : null
      const sat = o.satuan?.trim() || null
      if (vol && sat) return `${name} ${vol} ${sat}`
      if (vol) return `${name} ${vol}`
      if (sat) return `${name} (${sat})`
      return name
    })
    .filter((v): v is string => Boolean(v))
  return parts.length ? parts.join(' · ') : null
}

export function extractKegiatanContext(detail: PekerjaanDetail): KegiatanPekerjaanContext {
  const desa = detail.desa?.nama_desa?.trim() || null
  const kecamatan = detail.kecamatan?.nama_kecamatan?.trim() || null
  const outputLine = formatOutputWithVolume(detail.output ?? [])
  const outcomeParts = [
    detail.kegiatan?.nama_kegiatan?.trim(),
    detail.kegiatan?.nama_sub_kegiatan?.trim(),
  ].filter(Boolean)
  const outcomeLine = outcomeParts.length ? outcomeParts.join(' · ') : null
  const pengawas = detail.pengawas?.nama?.trim() || null
  const tahunAnggaran = detail.kegiatan?.tahun_anggaran ?? null

  return {
    pekerjaanId: detail.id,
    namaPaket: detail.nama_paket?.trim() || `Pekerjaan #${detail.id}`,
    desa,
    kecamatan,
    outputLine,
    outcomeLine,
    pengawas,
    tahunAnggaran,
  }
}

export function buildKegiatanCaption(input: {
  namaKegiatan: string
  namaPaket: string
  desa?: string | null
  kecamatan?: string | null
  outputLine?: string | null
  outcomeLine?: string | null
  pengawas?: string | null
  koordinat?: string | null
  tahunAnggaran?: string | number | null
  keterangan?: string | null
}): string {
  const loc = [input.desa?.trim(), input.kecamatan?.trim()].filter(Boolean).join(' · ')
  const year =
    input.tahunAnggaran != null && String(input.tahunAnggaran).trim()
      ? `TA ${String(input.tahunAnggaran).trim()}`
      : null
  const title =
    input.namaKegiatan.trim() ||
    input.namaPaket.trim() ||
    'Kegiatan lapangan'

  return [
    title,
    input.namaPaket.trim() && input.namaPaket.trim() !== title
      ? `Paket: ${input.namaPaket.trim()}`
      : null,
    loc || null,
    input.outcomeLine?.trim() ? `Outcome: ${input.outcomeLine.trim()}` : null,
    input.outputLine?.trim() ? `Output: ${input.outputLine.trim()}` : null,
    input.keterangan?.trim() ? `Keterangan: ${input.keterangan.trim()}` : null,
    input.pengawas?.trim() ? `Pengawas: ${input.pengawas.trim()}` : null,
    input.koordinat?.trim() ? `GPS: ${input.koordinat.trim()}` : null,
    year,
    '@bidang_ams · Bidang Air Minum dan Sanitasi',
    'ARUMANIS · Pengawasan Lapangan',
  ]
    .filter(Boolean)
    .join('\n')
}

export function draftToStoryMeta(draft: KegiatanLapanganDraft): StoryShareMeta {
  const loc = [draft.desa?.trim(), draft.kecamatan?.trim()].filter(Boolean)
  const year = draft.tahunAnggaran != null ? String(draft.tahunAnggaran) : null
  const namaKegiatan = draft.namaKegiatan?.trim() || 'Kegiatan Lapangan'
  const namaPaket = draft.namaPaket?.trim() || 'Pekerjaan'

  return {
    title: namaKegiatan,
    subtitle: namaPaket,
    locationLine: loc.length ? loc.join(' · ') : 'Lokasi belum diisi',
    outputLine: draft.outputLine?.trim() || '-',
    slotLine: draft.outcomeLine?.trim() || 'Kegiatan Lapangan',
    penerimaLine: draft.keterangan?.trim() || null,
    pengawasLine: draft.pengawas?.trim() || null,
    koordinatLine: draft.koordinat?.trim() || 'Koordinat tidak tersedia',
    tanggalLine: formatDateTime(draft.updatedAt || draft.createdAt) || '-',
    brandLine: year
      ? `ARUMANIS · Pengawasan · TA ${year}`
      : 'ARUMANIS · Pengawasan Lapangan',
    badge: namaKegiatan.toUpperCase(),
    theme: 'ams',
    slotLabel: 'OUTCOME',
    penerimaLabel: draft.keterangan?.trim() ? 'KETERANGAN' : undefined,
  }
}

async function readAll(): Promise<KegiatanLapanganDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'),
      )
      .map((item) => normalizeDraft(item))
  } catch {
    return []
  }
}

/** Backward-compatible normalize untuk draft lama tanpa namaKegiatan. */
function normalizeDraft(raw: Record<string, unknown>): KegiatanLapanganDraft {
  const namaPaket = typeof raw.namaPaket === 'string' ? raw.namaPaket : 'Pekerjaan'
  const namaKegiatan =
    typeof raw.namaKegiatan === 'string' && raw.namaKegiatan.trim()
      ? raw.namaKegiatan.trim()
      : namaPaket

  return {
    id: String(raw.id),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    photoUri: typeof raw.photoUri === 'string' ? raw.photoUri : '',
    namaKegiatan,
    keterangan: typeof raw.keterangan === 'string' ? raw.keterangan : null,
    pekerjaanId: Number(raw.pekerjaanId) || 0,
    namaPaket,
    desa: (raw.desa as string | null | undefined) ?? null,
    kecamatan: (raw.kecamatan as string | null | undefined) ?? null,
    outputLine: (raw.outputLine as string | null | undefined) ?? null,
    outcomeLine: (raw.outcomeLine as string | null | undefined) ?? null,
    pengawas: (raw.pengawas as string | null | undefined) ?? null,
    tahunAnggaran: (raw.tahunAnggaran as string | number | null | undefined) ?? null,
    koordinat: (raw.koordinat as string | null | undefined) ?? null,
    caption: typeof raw.caption === 'string' ? raw.caption : '',
  }
}

async function writeAll(items: KegiatanLapanganDraft[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export async function listKegiatanLapanganDrafts(): Promise<KegiatanLapanganDraft[]> {
  const items = await readAll()
  return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function getKegiatanLapanganDraft(id: string): Promise<KegiatanLapanganDraft | null> {
  const items = await readAll()
  return items.find((d) => d.id === id) ?? null
}

export async function saveKegiatanLapanganDraft(
  input: Omit<KegiatanLapanganDraft, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string
  },
): Promise<KegiatanLapanganDraft> {
  if (!input.namaKegiatan?.trim()) {
    throw new Error('Nama kegiatan lapangan wajib diisi.')
  }
  if (!input.photoUri?.trim()) {
    throw new Error('Foto wajib diisi.')
  }
  if (!input.pekerjaanId) {
    throw new Error('Pilih paket pekerjaan.')
  }
  if (!input.caption?.trim()) {
    throw new Error('Caption tidak boleh kosong.')
  }

  const items = await readAll()
  const now = new Date().toISOString()
  const existingIdx = input.id ? items.findIndex((d) => d.id === input.id) : -1

  if (existingIdx >= 0) {
    const prev = items[existingIdx]!
    const next: KegiatanLapanganDraft = {
      ...prev,
      ...input,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: now,
      namaKegiatan: input.namaKegiatan.trim(),
      keterangan: input.keterangan?.trim() || null,
      photoUri: input.photoUri.trim(),
      caption: input.caption.trim(),
      namaPaket: input.namaPaket.trim() || prev.namaPaket,
    }
    items[existingIdx] = next
    await writeAll(items)
    return next
  }

  const created: KegiatanLapanganDraft = {
    id: input.id || newId(),
    createdAt: now,
    updatedAt: now,
    photoUri: input.photoUri.trim(),
    namaKegiatan: input.namaKegiatan.trim(),
    keterangan: input.keterangan?.trim() || null,
    pekerjaanId: input.pekerjaanId,
    namaPaket: input.namaPaket.trim() || `Pekerjaan #${input.pekerjaanId}`,
    desa: input.desa ?? null,
    kecamatan: input.kecamatan ?? null,
    outputLine: input.outputLine ?? null,
    outcomeLine: input.outcomeLine ?? null,
    pengawas: input.pengawas ?? null,
    tahunAnggaran: input.tahunAnggaran ?? null,
    koordinat: input.koordinat ?? null,
    caption: input.caption.trim(),
  }
  items.unshift(created)
  await writeAll(items)
  return created
}

export async function deleteKegiatanLapanganDraft(id: string): Promise<void> {
  const items = await readAll()
  await writeAll(items.filter((d) => d.id !== id))
}
