/**
 * Wilayah display helpers for pengawas (web + mobile).
 *
 * API Resource aliases (preferred):
 * - nama_kecamatan ← DB tbl_kecamatan.n_kec
 * - nama_desa ← DB tbl_desa.n_desa
 *
 * Always read API shape in the client; fall back to raw DB names if present.
 */

export type KecamatanLike = {
  nama_kecamatan?: string | null
  n_kec?: string | null
  name?: string | null
} | null | undefined

export type DesaLike = {
  nama_desa?: string | null
  n_desa?: string | null
  name?: string | null
} | null | undefined

export function getKecamatanName(kecamatan: KecamatanLike): string {
  if (!kecamatan) return ''
  return (
    kecamatan.nama_kecamatan?.trim() ||
    kecamatan.n_kec?.trim() ||
    kecamatan.name?.trim() ||
    ''
  )
}

export function getDesaName(desa: DesaLike): string {
  if (!desa) return ''
  return desa.nama_desa?.trim() || desa.n_desa?.trim() || desa.name?.trim() || ''
}

export function formatLokasiWilayah(
  desa?: DesaLike,
  kecamatan?: KecamatanLike,
  options?: { separator?: string; order?: 'desa-kec' | 'kec-desa' },
): string {
  const sep = options?.separator ?? ' · '
  const order = options?.order ?? 'kec-desa'
  const desaName = getDesaName(desa)
  const kecName = getKecamatanName(kecamatan)
  const parts =
    order === 'desa-kec' ? [desaName, kecName] : [kecName, desaName]
  return parts.filter(Boolean).join(sep)
}

export function formatPekerjaanLokasi(
  pekerjaan?: {
    desa?: DesaLike
    kecamatan?: KecamatanLike
    is_konsultan?: boolean
  } | null,
  options?: {
    separator?: string
    order?: 'desa-kec' | 'kec-desa'
    empty?: string
  },
): string {
  if (!pekerjaan) return options?.empty ?? '-'
  if (pekerjaan.is_konsultan) return options?.empty ?? '—'
  const label = formatLokasiWilayah(pekerjaan.desa, pekerjaan.kecamatan, {
    separator: options?.separator,
    order: options?.order,
  })
  return label || options?.empty || '-'
}
