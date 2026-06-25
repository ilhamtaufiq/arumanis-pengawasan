import { syncAuthToken } from '@/lib/api'
import { getMainAppDashboardUrl, normalizeBearerToken } from '@/lib/sso-token'

const ACCESS_TOKEN_COOKIE = 'thisisjustarandomstring'
const USER_DATA_COOKIE = 'auth_user_data'
const IMPERSONATOR_COOKIE = 'auth_impersonator_data'
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7

const COOKIE_PATH = (() => {
  try {
    const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
    const normalized = base.replace(/\/$/, '') || ''
    return normalized || '/'
  } catch {
    return '/'
  }
})()

type ImpersonatorUser = {
  id: number
  name: string
  email: string
  roles?: string[] | Array<{ name: string }>
}

type ImpersonatorState = {
  user: ImpersonatorUser
  token: string
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
  const pathPart = COOKIE_PATH === '/' ? 'path=/' : `path=${COOKIE_PATH}`
  document.cookie = `${name}=${value}; ${pathPart}; max-age=${maxAge}`
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  const pathPart = COOKIE_PATH === '/' ? 'path=/' : `path=${COOKIE_PATH}`
  document.cookie = `${name}=; ${pathPart}; max-age=0`
}

function parseJsonCookie<T>(name: string): T | null {
  const raw = getCookie(name)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getImpersonatorState(): ImpersonatorState | null {
  const state = parseJsonCookie<ImpersonatorState>(IMPERSONATOR_COOKIE)
  if (!state?.user || !state.token) return null
  return state
}

export function getImpersonatedUser(): ImpersonatorUser | null {
  return parseJsonCookie<ImpersonatorUser>(USER_DATA_COOKIE)
}

export function isImpersonating(): boolean {
  return getImpersonatorState() !== null
}

export async function stopImpersonating(): Promise<boolean> {
  const impersonator = getImpersonatorState()
  if (!impersonator) return false

  const adminToken = normalizeBearerToken(impersonator.token)

  try {
    await syncAuthToken(adminToken)
  } catch {
    // Continue restoring client cookies even if BFF sync fails.
  }

  setCookie(USER_DATA_COOKIE, JSON.stringify(impersonator.user))
  setCookie(ACCESS_TOKEN_COOKIE, JSON.stringify(adminToken))
  removeCookie(IMPERSONATOR_COOKIE)

  window.location.replace(getMainAppDashboardUrl())
  return true
}