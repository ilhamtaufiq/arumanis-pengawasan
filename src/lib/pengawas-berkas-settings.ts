/** Shared helpers: judul berkas RAB/GAMBAR/NEGO untuk role pengawas. */

export type AppSettingLike = {
  key: string
  value?: string | null
}

export const PENGAWAS_SHARED_BERKAS_JUDULS = ['RAB', 'GAMBAR', 'NEGO'] as const
export type PengawasSharedBerkasJudul = (typeof PENGAWAS_SHARED_BERKAS_JUDULS)[number]

export const PENGAWAS_BERKAS_JUDUL_SETTING_KEYS: Record<PengawasSharedBerkasJudul, string> = {
  RAB: 'pengawas_berkas_show_rab',
  GAMBAR: 'pengawas_berkas_show_gambar',
  NEGO: 'pengawas_berkas_show_nego',
}

export function getSettingValue(settings: AppSettingLike[] | undefined, key: string): string {
  if (!settings) return ''
  const setting = settings.find((s) => s.key === key)
  return setting?.value || ''
}

/** Default off — harus diaktifkan admin di Arumanis. */
export function isPengawasBerkasJudulEnabled(
  settings: AppSettingLike[] | undefined,
  judul: PengawasSharedBerkasJudul,
): boolean {
  return getSettingValue(settings, PENGAWAS_BERKAS_JUDUL_SETTING_KEYS[judul]) === '1'
}

export function getPengawasVisibleBerkasJuduls(
  settings: AppSettingLike[] | undefined,
): PengawasSharedBerkasJudul[] {
  return PENGAWAS_SHARED_BERKAS_JUDULS.filter((judul) => isPengawasBerkasJudulEnabled(settings, judul))
}

export function matchesPengawasSharedBerkasJudul(
  jenisDokumen: string | null | undefined,
  allowedJuduls: readonly string[],
): boolean {
  const normalized = (jenisDokumen ?? '').trim().toLowerCase()
  if (!normalized || allowedJuduls.length === 0) return false
  return allowedJuduls.some((judul) => judul.trim().toLowerCase() === normalized)
}
