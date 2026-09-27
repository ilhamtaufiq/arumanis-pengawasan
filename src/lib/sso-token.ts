export const SSO_TOKEN_PARAMS = ['token', 'access_token', 'auth_token'] as const
export const SSO_HANDOFF_PARAMS = ['code', 'handoff'] as const

const SSO_BOOTSTRAP_SUFFIXES = ['/login', '/sign-in'] as const

export function getHandoffCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)

  for (const key of SSO_HANDOFF_PARAMS) {
    const value = params.get(key)
    if (value?.trim()) {
      return value.trim()
    }
  }

  return null
}

export function stripHandoffCodeFromSearch(search: string): string {
  const params = new URLSearchParams(search)

  for (const key of SSO_HANDOFF_PARAMS) {
    params.delete(key)
  }

  const next = params.toString()
  return next ? `?${next}` : ''
}

export function getSsoTokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)

  for (const key of SSO_TOKEN_PARAMS) {
    const value = params.get(key)
    if (value?.trim()) {
      return value.trim()
    }
  }

  return null
}

export function stripSsoTokenFromSearch(search: string): string {
  const params = new URLSearchParams(search)

  for (const key of SSO_TOKEN_PARAMS) {
    params.delete(key)
  }
  for (const key of SSO_HANDOFF_PARAMS) {
    params.delete(key)
  }

  const next = params.toString()
  return next ? `?${next}` : ''
}

export function stripSsoTokenFromPath(path: string): string {
  const [pathname, search = ''] = path.split('?')
  const cleanSearch = stripSsoTokenFromSearch(search ? `?${search}` : '')
  return `${pathname}${cleanSearch}`
}

export function stripSsoTokenFromUrl(url: string): string {
  const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const cleanSearch = stripSsoTokenFromSearch(parsed.search)
  return `${parsed.pathname}${cleanSearch}${parsed.hash}`
}

export function isSsoBootstrapPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'

  return SSO_BOOTSTRAP_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(suffix),
  )
}

export function buildSsoBootstrapSearch(token: string): string {
  return `?token=${encodeURIComponent(token)}`
}

/**
 * Canonicalize SSO token handling on a URL.
 * Bootstrap routes keep a single `token` param; all other routes strip SSO params.
 */
export function sanitizeLocationUrl(url: URL): URL {
  const next = new URL(url.toString())
  const token = getSsoTokenFromSearch(next.search)
  const keepToken = Boolean(token) && isSsoBootstrapPath(next.pathname)

  for (const key of SSO_TOKEN_PARAMS) {
    next.searchParams.delete(key)
  }
  for (const key of SSO_HANDOFF_PARAMS) {
    next.searchParams.delete(key)
  }

  if (keepToken && token) {
    next.searchParams.set('token', token)
  }

  return next
}

export function sanitizeHrefForNavigation(href: string): string {
  return sanitizeLocationUrl(new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')).toString()
}

export function resolveRootRedirectLocation(
  publicBase: string,
  pathname: string,
  search = '',
): string {
  const normalizedBase = publicBase.replace(/\/$/, '') || ''
  const query = search ? (search.startsWith('?') ? search : `?${search}`) : ''
  const token = getSsoTokenFromSearch(query)

  if (token && (pathname === '/' || pathname === '' || pathname === normalizedBase)) {
    return `${normalizedBase}/login${buildSsoBootstrapSearch(token)}`
  }

  return `${normalizedBase}/`
}

export function normalizeBearerToken(value: string): string {
  const trimmed = value.trim()

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed)
      return typeof parsed === 'string' ? parsed : trimmed
    } catch {
      return trimmed
    }
  }

  return trimmed
}

export function getMainAppBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_MAIN_APP_URL as string | undefined)?.trim().replace(/\/+$/, '')
  if (fromEnv) return fromEnv
  return window.location.origin
}

export function getMainAppDashboardUrl(): string {
  return new URL('/dashboard', getMainAppBaseUrl()).toString()
}

export function getPengawasPublicPath(pathname: string, search = ''): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const cleanPath = stripSsoTokenFromPath(`${pathname}${search}`)

  if (!base || base === '/') {
    return cleanPath || '/'
  }

  // Idempoten: pathname dari window.location sudah mengandung base,
  // sedangkan pathname router sudah dikupas basename-nya.
  if (cleanPath === base || cleanPath.startsWith(`${base}/`)) {
    return cleanPath || base
  }

  return `${base}${cleanPath}` || base
}

/**
 * Target navigasi pasca-login di dalam router (relatif terhadap basename).
 * Menolak open-redirect (hanya path absolut lokal) dan mengupas prefix
 * base publik bila issuer mengirim full public path
 * (mis. /pengawasan/pekerjaan/5 -> /pekerjaan/5).
 */
export function resolveLoginRedirectTarget(
  target: string | null | undefined,
  base: string = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''),
): string {
  if (!target) {
    return '/'
  }

  if (!target.startsWith('/') || target.startsWith('//')) {
    return '/'
  }

  if (base && base !== '/' && (target === base || target.startsWith(`${base}/`))) {
    const stripped = target.slice(base.length) || '/'
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }

  return target
}

export function getMainAppSignInUrl(redirectPath?: string): string {
  const url = new URL('/sign-in', getMainAppBaseUrl())

  if (redirectPath) {
    url.searchParams.set('redirect', redirectPath)
  }

  return url.toString()
}

export function redirectToMainAppSignIn(redirectPath?: string): void {
  window.location.replace(getMainAppSignInUrl(redirectPath))
}