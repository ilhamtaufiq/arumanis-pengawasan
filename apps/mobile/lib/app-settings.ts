/**
 * App settings dari backend (sama sumber pengaturan www/bun).
 * Key penting: `tahun_anggaran` = tahun anggaran aktif.
 */
import { getApiBaseUrl } from '@/lib/config'
import { ensureSessionToken, getSessionTokenSync } from '@/lib/session'

export type AppSettingItem = {
  id?: number
  key: string
  value?: string | null
  type?: string
}

let cache: { map: Record<string, string>; at: number } | null = null
const CACHE_TTL_MS = 5 * 60_000

export function clearAppSettingsCache(): void {
  cache = null
}

function settingsToMap(items: AppSettingItem[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of items) {
    if (!item?.key) continue
    if (item.value == null || item.value === '') continue
    map[item.key] = String(item.value)
  }
  return map
}

/**
 * GET /app-settings — publik di backend, tetap kirim Bearer bila ada.
 */
export async function fetchAppSettingsMap(force = false): Promise<Record<string, string>> {
  const now = Date.now()
  if (!force && cache && now - cache.at < CACHE_TTL_MS) {
    return cache.map
  }

  const base = getApiBaseUrl().replace(/\/$/, '')
  const token = getSessionTokenSync() ?? (await ensureSessionToken())
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${base}/app-settings`, { headers })
  const body = (await res.json().catch(() => null)) as
    | { data?: AppSettingItem[] }
    | AppSettingItem[]
    | null

  if (!res.ok) {
    throw new Error(`Gagal memuat pengaturan app (${res.status})`)
  }

  const items = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : []

  const map = settingsToMap(items)
  cache = { map, at: now }
  return map
}

/** Tahun anggaran aktif dari AppSetting key `tahun_anggaran` (contoh: "2026"). */
export async function fetchTahunAnggaranAktif(force = false): Promise<string | null> {
  const map = await fetchAppSettingsMap(force)
  const raw = map.tahun_anggaran?.trim()
  if (!raw) return null
  // Hanya angka 4 digit yang valid
  if (!/^\d{4}$/.test(raw)) return null
  return raw
}
