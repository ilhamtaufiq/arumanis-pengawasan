import { ApiError, createApiClient, formatApiError, unwrapEntity } from '@pengawas/api-client'
import type { AuthUser } from '@pengawas/shared'
import { signInWithGoogle } from './google-auth'
import { formatNetworkFailureMessage, getApiBaseUrl } from './config'
import {
  clearSessionToken,
  ensureSessionToken,
  getSessionTokenSync,
  setSessionToken,
  setSessionTokenSync,
} from './session'

void ensureSessionToken()

function createMobileApiClient() {
  const apiBase = getApiBaseUrl()
  return createApiClient({
    apiPrefix: apiBase,
    bffPrefix: apiBase,
    credentials: 'omit',
    getAuthHeader: async () => {
      const token = getSessionTokenSync() ?? (await ensureSessionToken())
      return token ? `Bearer ${token}` : undefined
    },
  })
}

export const api = createMobileApiClient()

export { getSessionTokenSync, setSessionTokenSync }

export async function hydrateSessionToken() {
  return ensureSessionToken()
}

function extractToken(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  if (typeof record.token === 'string') return record.token

  if (record.data && typeof record.data === 'object') {
    const nested = (record.data as Record<string, unknown>).token
    if (typeof nested === 'string') return nested
  }

  return null
}

/**
 * Login langsung ke APIAMIS — alur sama dengan handleLogin di www/bun/server.
 * Token disimpan lokal (SecureStore / sessionStorage web), bukan httpOnly cookie.
 */
export async function mobileLogin(input: { email: string; password: string }) {
  const apiBase = getApiBaseUrl()
  let response: Response

  try {
    response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
  } catch (error) {
    throw new Error(formatNetworkFailureMessage(error, 'Login') ?? 'Login gagal')
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const err = new ApiError('Login gagal', response.status, payload)
    throw new ApiError(formatApiError(err, 'Login gagal'), response.status, payload)
  }

  const token = extractToken(payload)
  if (!token?.trim()) {
    throw new Error('Token tidak diterima dari server')
  }

  const user = unwrapEntity<AuthUser>(payload)
  await setSessionToken(token)
  setSessionTokenSync(token)

  return user
}

export async function mobileGoogleLogin() {
  const token = await signInWithGoogle()
  await setSessionToken(token)
  setSessionTokenSync(token)
  return me()
}

export async function mobileLogout() {
  try {
    await api.logout()
  } catch {
    // Token mungkin sudah kedaluwarsa — tetap bersihkan sesi lokal.
  } finally {
    await clearSessionToken()
    setSessionTokenSync(null)
  }
}

export const {
  me,
  getPengawasStatistics,
  getDashboardStats,
  getPekerjaanList,
  getPekerjaanDetail,
  getPenerimaByPekerjaan,
  createPenerima,
  updatePenerima,
  deletePenerima,
  getProgressReport,
  updateProgress,
  getPekerjaanProgressEstimasi,
  savePekerjaanProgressEstimasi,
  createFoto,
  getFoto,
  updateFoto,
  validateKoordinat,
  deleteFoto,
  createOutput,
  updateOutput,
  deleteOutput,
  createTiket,
  getTiketList,
  getPengawasList,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendPresenceHeartbeat,
} = api