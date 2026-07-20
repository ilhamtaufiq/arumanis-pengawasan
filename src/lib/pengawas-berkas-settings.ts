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

/** Alias case-insensitive — selaras dengan backend AppSetting::PENGAWAS_BERKAS_JUDUL_ALIASES. */
export const PENGAWAS_BERKAS_JUDUL_ALIASES: Record<PengawasSharedBerkasJudul, readonly string[]> = {
  RAB: ['rab', 'r.a.b', 'r a b'],
  GAMBAR: ['gambar', 'gbr', 'g.b.r', 'g b r', 'drawing'],
  NEGO: ['nego', 'negosiasi', 'negos', 'hasil nego', 'hasil negosiasi'],
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

export function normalizeBerkasJudul(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function compactBerkasJudul(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Cocokkan jenis_dokumen ke judul shared:
 * case-insensitive, alias (gbr/gambar/rab/nego…), prefix, whole-word, compact.
 */
export function matchesPengawasSharedBerkasJudul(
  jenisDokumen: string | null | undefined,
  allowedJuduls: readonly string[],
): boolean {
  const raw = (jenisDokumen ?? '').trim()
  if (!raw || allowedJuduls.length === 0) return false

  const normalized = normalizeBerkasJudul(raw)
  const compact = compactBerkasJudul(raw)

  for (const judul of allowedJuduls) {
    const key = judul.trim().toUpperCase() as PengawasSharedBerkasJudul
    const aliases =
      PENGAWAS_BERKAS_JUDUL_ALIASES[key] ?? ([normalizeBerkasJudul(judul)] as readonly string[])

    for (const alias of aliases) {
      const a = normalizeBerkasJudul(alias)
      const ac = compactBerkasJudul(alias)
      if (!a && !ac) continue

      if (normalized === a) return true
      if (ac && compact === ac) return true
      if (a && (normalized.startsWith(`${a} `) || normalized.startsWith(`${a}-`))) return true
      if (ac && ac.length >= 3 && compact.startsWith(ac)) return true
      if (a) {
        const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(a)}(?:[^a-z0-9]|$)`, 'i')
        if (re.test(normalized)) return true
      }
    }
  }

  return false
}
