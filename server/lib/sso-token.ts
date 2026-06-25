const SSO_TOKEN_PARAMS = ['token', 'access_token', 'auth_token'] as const

function getSsoTokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)

  for (const key of SSO_TOKEN_PARAMS) {
    const value = params.get(key)
    if (value?.trim()) {
      return value.trim()
    }
  }

  return null
}

function buildSsoBootstrapSearch(token: string): string {
  return `?token=${encodeURIComponent(token)}`
}

/** Dev-only root redirect helper — kept in server/ so Docker runtime does not need src/. */
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