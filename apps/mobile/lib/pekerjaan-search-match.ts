import type { Pekerjaan, PaginatedResponse } from '@pengawas/shared'

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (value == null || depth > 4) return
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value).trim()
    if (s) out.push(s)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1)
    return
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out, depth + 1)
    }
  }
}

/** Normalisasi untuk match longgar (huruf kecil, spasi rapi). */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    // hapus diacritic
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cocokkan keyword ke SEMUA string di objek pekerjaan (paket, desa, kec, dll). */
export function matchPekerjaanKeyword(item: Pekerjaan, keyword: string): boolean {
  const q = normalizeSearchText(keyword)
  if (!q) return true

  const parts: string[] = []
  collectStrings(item, parts)
  const hay = normalizeSearchText(parts.join(' '))

  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  // Setiap kata harus muncul di haystack
  return tokens.every((t) => hay.includes(t))
}

function metaTotal(meta: Record<string, unknown> | undefined): number {
  const n = Number(meta?.total)
  return Number.isFinite(n) ? n : 0
}

/**
 * Deteksi API mengabaikan `search` (total masih raksasa, page tidak cocok keyword).
 */
export function serverSearchLikelyIgnored(
  keyword: string,
  res: PaginatedResponse<Pekerjaan>,
): boolean {
  const q = keyword.trim()
  if (!q || res.data.length === 0) return false
  const matches = res.data.filter((item) => matchPekerjaanKeyword(item, q))
  if (matches.length > 0) return false
  const total = metaTotal(res.meta as Record<string, unknown> | undefined)
  return total > 50 && total >= res.data.length
}

export function matchPekerjaanTahun(item: Pekerjaan, tahun: string): boolean {
  const y = tahun.trim()
  if (!y) return true
  const itemYear = item.kegiatan?.tahun_anggaran
  if (itemYear == null) return false
  return String(itemYear) === y
}
