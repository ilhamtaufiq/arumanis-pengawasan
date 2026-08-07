/** Opsi standar — selaras dengan Arumanis DEFAULT_JENIS_DOKUMEN. */
export const DEFAULT_JENIS_DOKUMEN = [
  'RAB',
  'GAMBAR',
  'NEGO',
  'Kontrak',
  'SPK',
  'BA Klarifikasi',
  'Hasil Negosiasi',
  'Laporan Harian',
  'Laporan Mingguan',
  'Berita Acara',
  'Dokumentasi',
  'Surat',
  'Lainnya',
] as const

const CREATE_VALUE = '__create__'

export { CREATE_VALUE as JENIS_DOKUMEN_CREATE_VALUE }

export function mergeJenisDokumenOptions(
  fromApi: string[] = [],
  extras: string[] = [],
  selected?: string | null,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  const push = (raw: string | null | undefined) => {
    const value = (raw ?? '').trim()
    if (!value) return
    const key = value.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(value)
  }

  for (const item of DEFAULT_JENIS_DOKUMEN) push(item)
  for (const item of fromApi) push(item)
  for (const item of extras) push(item)
  push(selected)

  return result
}
