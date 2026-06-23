const ACCESS_TOKEN_COOKIE = 'thisisjustarandomstring'
const USER_DATA_COOKIE = 'auth_user_data'
const IMPERSONATOR_COOKIE = 'auth_impersonator_data'
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7

// Cookie path should preferably match the app mount point so it works correctly
// both at root and under /pengawasan (or whatever APP_PUBLIC_BASE_PATH).
const COOKIE_PATH = (() => {
  try {
    const base = (import.meta as any).env?.BASE_URL || '/'
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

export function stopImpersonating(redirectTo = '/') {
  const impersonator = getImpersonatorState()
  if (!impersonator) return false

  setCookie(USER_DATA_COOKIE, JSON.stringify(impersonator.user))
  setCookie(ACCESS_TOKEN_COOKIE, JSON.stringify(impersonator.token))
  removeCookie(IMPERSONATOR_COOKIE)

  // Use full path so it works with subpath deployments (basename).
  // Hard navigation because we changed auth-related cookies.
  const base = (import.meta as any).env?.BASE_URL || '/'
  const target = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`
  const finalUrl = `${base.replace(/\/$/, '')}${target}`.replace(/\/$/, '') || '/'
  window.location.assign(finalUrl)
  return true
}