import { ApiError, me, requestJson, unwrapEntity } from '@/lib/api'
import type { AuthUser } from '@pengawas/shared'
import { getMainAppDashboardUrl } from '@/lib/sso-token'

/**
 * Impersonasi: token TIDAK PERNAH disimpan di sisi frontend.
 * APIAMIS men-set cookie httpOnly `arumanis_token` (target) dan `arumanis_impersonator` (admin).
 * Frontend hanya menyimpan data tampilan (id, nama, email, role) untuk banner.
 */

/** Cookie data tampilan saja. Tidak boleh berisi token apa pun. */
const DISPLAY_COOKIE = 'pengawas_impersonation_display'
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7

const IMPERSONATE_START_PATH = (userId: number) => `/auth/impersonate/${userId}`
const IMPERSONATE_STOP_PATH = '/auth/impersonate/stop'

/** Nama cookie lama yang menyimpan token di JavaScript. Dihapus agar tidak ada sisa token. */
const LEGACY_TOKEN_COOKIES = ['thisisjustarandomstring', 'auth_impersonator_data', 'auth_user_data'] as const

const COOKIE_PATH = (() => {
  try {
    const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
    const normalized = base.replace(/\/$/, '') || ''
    return normalized || '/'
  } catch {
    return '/'
  }
})()

export type ImpersonationDisplayUser = {
  id: number
  name: string
  email: string
  role: string | null
}

type ImpersonationDisplayState = {
  impersonated: ImpersonationDisplayUser
  impersonator: ImpersonationDisplayUser
}

function cookiePath(): string {
  return COOKIE_PATH === '/' ? 'path=/' : `path=${COOKIE_PATH}`
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }

  return undefined
}

function setCookie(name: string, value: string, maxAge = DEFAULT_MAX_AGE) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookiePath()}; max-age=${maxAge}; SameSite=Lax`
}

function removeCookie(name: string, path = cookiePath()) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; ${path}; max-age=0`
}

/** Hapus cookie token lama (jika ada dari versi sebelumnya) di path yang mungkin dipakai. */
function purgeLegacyTokenCookies() {
  if (typeof document === 'undefined') return
  for (const name of LEGACY_TOKEN_COOKIES) {
    removeCookie(name, cookiePath())
    removeCookie(name, 'path=/')
  }
}

// Dijalankan sekali saat modul dimuat. Aman jika cookie tidak ada.
purgeLegacyTokenCookies()

function toDisplayUser(user: AuthUser): ImpersonationDisplayUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roles?.[0]?.name ?? null,
  }
}

function isDisplayUser(value: unknown): value is ImpersonationDisplayUser {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'number' && typeof record.name === 'string' && typeof record.email === 'string'
}

function readDisplayState(): ImpersonationDisplayState | null {
  const raw = getCookie(DISPLAY_COOKIE)
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ImpersonationDisplayState>
    if (!isDisplayUser(parsed.impersonated) || !isDisplayUser(parsed.impersonator)) return null
    return parsed as ImpersonationDisplayState
  } catch {
    return null
  }
}

/** Data admin asli (yang melakukan impersonasi), hanya untuk tampilan. */
export function getImpersonatorState(): { user: ImpersonationDisplayUser } | null {
  const state = readDisplayState()
  if (!state) return null
  return { user: state.impersonator }
}

/** Data pengguna yang sedang diimpersonasi, hanya untuk tampilan. */
export function getImpersonatedUser(): ImpersonationDisplayUser | null {
  return readDisplayState()?.impersonated ?? null
}

export function isImpersonating(): boolean {
  return getImpersonatorState() !== null
}

/**
 * Mulai impersonasi. Backend men-set cookie httpOnly; frontend hanya menyimpan data tampilan.
 */
export async function startImpersonating(userId: number): Promise<void> {
  // Ambil admin yang sedang login sebelum berpindah sesi, untuk ditampilkan di banner.
  const admin = await me()

  const payload = await requestJson<unknown>(IMPERSONATE_START_PATH(userId), { method: 'POST' })
  const target = unwrapEntity<AuthUser>(payload)

  const state: ImpersonationDisplayState = {
    impersonated: toDisplayUser(target),
    impersonator: toDisplayUser(admin),
  }
  setCookie(DISPLAY_COOKIE, JSON.stringify(state))
}

/**
 * Berhenti impersonasi. Backend memulihkan token admin ke cookie httpOnly.
 * Return false bila backend masih menganggap sesi impersonasi aktif (banner tetap tampil).
 */
export async function stopImpersonating(): Promise<boolean> {
  if (!isImpersonating()) return false

  try {
    await requestJson<unknown>(IMPERSONATE_STOP_PATH, { method: 'POST' })
  } catch (error) {
    // 4xx berarti backend tidak punya sesi impersonasi untuk dihentikan (mis. cookie sudah habis),
    // jadi data tampilan dibersihkan agar banner tidak macet. Error lain (jaringan/5xx) tetap dipertahankan.
    const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500
    if (!isClientError) return false
  }

  removeCookie(DISPLAY_COOKIE)
  window.location.replace(getMainAppDashboardUrl())
  return true
}
