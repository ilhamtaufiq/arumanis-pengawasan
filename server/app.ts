import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { resolveRootRedirectLocation } from './lib/sso-token'

export interface AppEnv {
  APIAMIS_BASE_URL?: string
  PORT?: string
  SESSION_COOKIE_NAME?: string
  SESSION_COOKIE_PATH?: string
  SESSION_COOKIE_SECURE?: string
  APP_PUBLIC_BASE_PATH?: string
  BUN_ENV?: string
  NODE_ENV?: string
}

interface RequestConfig {
  apiBase: string
  cookieName: string
  cookieSecure: boolean
  cookiePath: string
  publicBasePath: string
  isProd: boolean
}

function readGlobalEnv(key: string): string | undefined {
  try {
    const bunEnv = (globalThis as unknown as { Bun?: { env?: Record<string, string | undefined> } }).Bun?.env
    if (bunEnv && bunEnv[key] != null) return bunEnv[key]
  } catch {
    // ignore
  }
  try {
    const procEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    if (procEnv && procEnv[key] != null) return procEnv[key]
  } catch {
    // ignore
  }
  return undefined
}

function getConfig(c: Context<{ Bindings: AppEnv }>): RequestConfig {
  const bindings = (c.env ?? {}) as AppEnv
  const get = (key: keyof AppEnv): string => {
    const fromBinding = bindings[key]
    if (fromBinding != null && fromBinding !== '') return fromBinding
    return readGlobalEnv(key) ?? ''
  }

  const apiBase = (get('APIAMIS_BASE_URL') || 'http://apiamis.test/api').replace(/\/$/, '')
  const cookieName = get('SESSION_COOKIE_NAME') || 'pengawas_session'
  const cookieSecure = get('SESSION_COOKIE_SECURE') === 'true'
  const rawCookiePath = get('SESSION_COOKIE_PATH')
  const cookiePath = (rawCookiePath !== '' ? rawCookiePath : '/pengawasan').replace(/\/$/, '') || '/'
  const rawBase = get('APP_PUBLIC_BASE_PATH')
  const publicBasePath = (rawBase !== '' ? rawBase : '/pengawasan').replace(/\/$/, '')
  const bunEnv = get('BUN_ENV')
  const nodeEnv = get('NODE_ENV')
  const isProd = bunEnv === 'production' || nodeEnv === 'production'

  return { apiBase, cookieName, cookieSecure, cookiePath, publicBasePath, isProd }
}

export function normalizeRequestPath(pathname: string, publicBasePath: string): string {
  if (!publicBasePath || !pathname.startsWith(publicBasePath)) {
    return pathname
  }
  const trimmed = pathname.slice(publicBasePath.length)
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function createApp(): Hono<{ Bindings: AppEnv }> {
  const app = new Hono<{ Bindings: AppEnv }>()

  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin')
    if (origin && isAllowedMobileOrigin(origin)) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type')
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      c.header('Vary', 'Origin')
    }
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }
    await next()
  })

  // Dev-only root -> base redirect. In production (stripping-proxy deploys) the
  // server sees '/' for the mounted entrypoint; redirecting would loop.
  // Decided per-request so one bundle works for Bun + Workers.
  app.use('*', async (c, next) => {
    if (c.req.method !== 'GET') return next()
    const url = new URL(c.req.url)
    const { publicBasePath, isProd } = getConfig(c)
    // Nowhere to redirect when serving from domain root.
    if (!publicBasePath || publicBasePath === '/') return next()
    const isRoot = url.pathname === '/' || url.pathname === '' || url.pathname === publicBasePath
    if (!isRoot || isProd) return next()
    const location = resolveRootRedirectLocation(publicBasePath || '/', url.pathname, url.search.slice(1))
    return c.redirect(location)
  })

  // Single dispatcher: match naked ('') and PUBLIC_BASE_PATH prefixes.
  // PUBLIC_BASE_PATH is per-request env, so exact-match routes can't cover it.
  app.all('*', async (c, next) => {
    const url = new URL(c.req.url)
    const stripped = matchBase(c, url.pathname)
    if (stripped == null) return next()

    const method = c.req.method
    if (method === 'GET' && stripped === '/health') return healthHandler(c)
    if (method === 'GET' && stripped === '/oauth-callback') return oauthCallbackHandler(c)
    if (method === 'POST' && stripped === '/bff/auth/mobile/login') return mobileLoginHandler(c)
    if (method === 'POST' && stripped === '/bff/auth/login') return webLoginHandler(c)
    if (method === 'POST' && stripped === '/bff/auth/sync-token') return syncTokenHandler(c)
    if (method === 'POST' && stripped === '/bff/auth/exchange-handoff') return exchangeHandoffHandler(c)
    if (method === 'GET' && stripped === '/bff/auth/me') return meHandler(c)
    if (method === 'POST' && stripped === '/bff/auth/logout') return logoutHandler(c)
    if (method === 'POST' && stripped === '/bff/broadcasting/auth') return broadcastingAuthHandler(c)
    if (stripped === '/bff/api' || stripped.startsWith('/bff/api/')) return proxyApiHandler(c)

    return next()
  })

  return app
}

/** Match request against '' or PUBLIC_BASE_PATH prefix. Returns stripped path or null. */
function matchBase(c: Context<{ Bindings: AppEnv }>, pathname: string): string | null {
  const { publicBasePath } = getConfig(c)
  if (pathname === '/health' || pathname === '/oauth-callback' || pathname.startsWith('/bff/')) {
    return pathname
  }
  if (publicBasePath && publicBasePath !== '/') {
    if (pathname === publicBasePath || pathname.startsWith(`${publicBasePath}/`)) {
      return normalizeRequestPath(pathname, publicBasePath)
    }
    return null
  }
  return pathname
}

function notMatched(c: Context) {
  return c.json({ message: 'Not Found' }, 404)
}

function healthHandler(c: Context<{ Bindings: AppEnv }>) {
  const pathname = new URL(c.req.url).pathname
  const stripped = matchBase(c, pathname)
  if (stripped !== '/health') return notMatched(c)
  const { isProd, apiBase } = getConfig(c)
  const payload: Record<string, string | boolean> = {
    ok: true,
    env: readBindingOrGlobal(c, 'BUN_ENV') || 'development',
    now: new Date().toISOString(),
  }
  if (!isProd) {
    payload.apiBase = apiBase
  }
  return c.json(payload)
}

function oauthCallbackHandler(c: Context<{ Bindings: AppEnv }>) {
  const pathname = new URL(c.req.url).pathname
  const stripped = matchBase(c, pathname)
  if (stripped !== '/oauth-callback') return notMatched(c)
  const { publicBasePath } = getConfig(c)
  const url = new URL(c.req.url)
  url.pathname = publicBasePath ? `${publicBasePath}/login` : '/login'
  return c.redirect(url.toString())
}

async function mobileLoginHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/mobile/login')) return notMatched(c)
  const { apiBase, isProd } = getConfig(c)
  if (isProd) {
    return c.json({ message: 'Login mobile dinonaktifkan di production. Gunakan SSO Arumanis.' }, 403)
  }
  try {
    const body = await safeJsonBody(c)
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    const payload = await safeParseResponse(response)
    if (!response.ok) {
      return c.json(payload ?? { message: 'Login gagal' }, response.status as never)
    }
    const token = extractToken(payload)
    if (!token) {
      return c.json({ message: 'Token tidak diterima dari backend' }, 502)
    }
    return c.json({
      token,
      user: extractEntity(
        (payload as Record<string, unknown>)?.['user'] ??
          (payload as Record<string, unknown>)?.['data'],
      ),
    })
  } catch {
    return c.json({ message: 'Login gagal' }, 500)
  }
}

async function webLoginHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/login')) return notMatched(c)
  const { apiBase, isProd, cookieName, cookieSecure, cookiePath } = getConfig(c)
  if (isProd) {
    return c.json({ message: 'Login lokal dinonaktifkan. Gunakan SSO Arumanis.' }, 403)
  }
  try {
    const body = await safeJsonBody(c)
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    const payload = await safeParseResponse(response)
    if (!response.ok) {
      return c.json(payload ?? { message: 'Login gagal' }, response.status as never)
    }
    const token = extractToken(payload)
    if (token) {
      setCookie(c, cookieName, token, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'Strict',
        path: cookiePath,
      })
    }
    return c.json({
      user: extractEntity(
        (payload as Record<string, unknown>)?.['user'] ??
          (payload as Record<string, unknown>)?.['data'],
      ),
    })
  } catch {
    return c.json({ message: 'Login gagal' }, 500)
  }
}

async function syncTokenHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/sync-token')) return notMatched(c)
  const { cookieName, cookieSecure, cookiePath } = getConfig(c)
  const body = await safeJsonBody(c)
  const token = typeof (body as { token?: unknown } | null)?.token === 'string'
    ? ((body as { token: string }).token.trim())
    : ''
  if (!token) {
    return c.json({ message: 'Token tidak valid' }, 400)
  }
  const verified = await verifyToken(c, token)
  if (!verified.ok) {
    return c.json({ message: 'Token tidak valid atau kedaluwarsa' }, 401)
  }
  setCookie(c, cookieName, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'Strict',
    path: cookiePath,
  })
  return c.json({ message: 'Sesi disinkronkan', user: verified.user })
}

async function exchangeHandoffHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/exchange-handoff')) return notMatched(c)
  const { apiBase, cookieName, cookieSecure, cookiePath } = getConfig(c)
  const body = await safeJsonBody(c)
  const code = typeof (body as { code?: unknown } | null)?.code === 'string'
    ? ((body as { code: string }).code.trim())
    : ''
  if (!code) {
    return c.json({ message: 'Kode handoff tidak valid' }, 400)
  }
  try {
    const response = await fetch(`${apiBase}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const payload = await safeParseResponse(response)
    if (!response.ok) {
      return c.json(payload ?? { message: 'Handoff gagal' }, response.status as never)
    }
    const token = extractToken(payload)
    if (!token) {
      return c.json({ message: 'Token handoff tidak ditemukan' }, 500)
    }
    setCookie(c, cookieName, token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'Strict',
      path: cookiePath,
    })
    return c.json({
      user: extractEntity((payload as { user?: unknown })?.user ?? payload),
      message: 'Sesi SSO berhasil disinkronkan',
    })
  } catch {
    return c.json({ message: 'Handoff service unavailable' }, 502)
  }
}

async function meHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/me')) return notMatched(c)
  const { apiBase } = getConfig(c)
  return forwardAuthRequest(c, `${apiBase}/auth/me`, 'GET')
}

async function logoutHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/auth/logout')) return notMatched(c)
  const { apiBase, cookiePath } = getConfig(c)
  const response = await forwardAuthRequest(c, `${apiBase}/auth/logout`, 'POST')
  deleteCookie(c, getConfig(c).cookieName, { path: cookiePath })
  if (response instanceof Response) {
    return response
  }
  return c.json({ message: 'Logged out' })
}

async function broadcastingAuthHandler(c: Context<{ Bindings: AppEnv }>) {
  if (!isBffPath(c, '/bff/broadcasting/auth')) return notMatched(c)
  const { apiBase } = getConfig(c)
  const token = resolveSessionToken(c)
  if (!token) {
    return c.json({ message: 'Unauthenticated' }, 401)
  }
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  const incomingContentType = c.req.header('content-type')
  if (incomingContentType) {
    headers.set('Content-Type', incomingContentType)
  }
  try {
    const init: RequestInit & { duplex?: string } = {
      method: 'POST',
      headers,
      body: c.req.raw.body,
    }
    if (init.body != null) {
      init.duplex = 'half'
    }
    const response = await fetch(`${apiBase}/broadcasting/auth`, init)
    return relayResponse(response)
  } catch {
    return c.json({ message: 'Upstream API tidak tersedia' }, 502)
  }
}

async function proxyApiHandler(c: Context<{ Bindings: AppEnv }>) {
  const pathname = new URL(c.req.url).pathname
  const { publicBasePath, apiBase } = getConfig(c)
  const requestPath = normalizeRequestPath(pathname, publicBasePath)
  if (!requestPath.startsWith('/bff/api')) return notMatched(c)
  const targetPath = (requestPath.replace(/^\/bff\/api/, '') || '/').replace(/^\//, '')
  const target = new URL(targetPath, `${apiBase}/`)
  target.search = new URL(c.req.url).search

  const headers = new Headers()
  headers.set('Accept', 'application/json')
  // Dual-role operator+pengawas: APIAMIS byUserRole membatasi ke assign di konteks lapangan.
  headers.set('X-Arumanis-App', 'pengawas')
  const incomingContentType = c.req.header('content-type')
  if (incomingContentType) {
    headers.set('Content-Type', incomingContentType)
  }
  const token = resolveSessionToken(c)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const incomingPin = c.req.header('x-pin')
  if (incomingPin) {
    headers.set('X-PIN', incomingPin)
  }

  // Stream request body (Workers-friendly, no full buffering for foto uploads).
  const hasBody = !['GET', 'HEAD'].includes(c.req.method)
  const init: RequestInit & { duplex?: string } = { method: c.req.method, headers }
  if (hasBody) {
    init.body = c.req.raw.body
    if (init.body != null) {
      init.duplex = 'half'
    }
  }
  try {
    const response = await fetch(target, init)
    return relayResponse(response)
  } catch {
    return c.json({ message: 'Upstream API tidak tersedia' }, 502)
  }
}

function isBffPath(c: Context<{ Bindings: AppEnv }>, suffix: string): boolean {
  const pathname = new URL(c.req.url).pathname
  return matchBase(c, pathname) === suffix
}

function readBindingOrGlobal(c: Context<{ Bindings: AppEnv }>, key: keyof AppEnv): string {
  const fromBinding = (c.env as AppEnv | undefined)?.[key]
  if (fromBinding != null && fromBinding !== '') return fromBinding
  return readGlobalEnv(key) ?? ''
}

async function safeJsonBody(c: Context) {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

async function safeParseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 204) return null
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  const text = await response.text()
  return text || null
}

function resolveSessionToken(c: Context<{ Bindings: AppEnv }>) {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim()
    if (bearer) return bearer
  }
  return getCookie(c, getConfig(c).cookieName) ?? null
}

function isAllowedMobileOrigin(origin: string) {
  return (
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('exp://') ||
    /^https?:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/.test(origin) ||
    /^https?:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin)
  )
}

async function forwardAuthRequest(c: Context<{ Bindings: AppEnv }>, target: string, method: string) {
  const { cookieName, cookiePath } = getConfig(c)
  const token = resolveSessionToken(c)
  if (!token) {
    return c.json({ message: 'Unauthenticated' }, 401 as never)
  }
  try {
    const response = await fetch(target, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const payload = await safeParseResponse(response)
    if (!response.ok) {
      return c.json(payload ?? { message: 'Request failed' }, response.status as never)
    }
    if (method === 'POST' && target.endsWith('/auth/logout')) {
      deleteCookie(c, cookieName, { path: cookiePath })
    }
    const body = payload as { data?: unknown; message?: string } | null
    return c.json({
      user: extractEntity((body as { data?: unknown } | null)?.data ?? body),
      message: (body as { message?: string } | null)?.message,
    })
  } catch {
    return c.json({ message: 'Auth service unavailable' }, 502)
  }
}

async function verifyToken(c: Context<{ Bindings: AppEnv }>, token: string) {
  const { apiBase } = getConfig(c)
  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const payload = await safeParseResponse(response)
    if (!response.ok) {
      return { ok: false as const, user: null }
    }
    return { ok: true as const, user: extractEntity(payload) }
  } catch {
    return { ok: false as const, user: null }
  }
}

function extractToken(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (typeof record['token'] === 'string') return record['token'] as string
  if (record['data'] && typeof record['data'] === 'object' && typeof (record['data'] as Record<string, unknown>)['token'] === 'string') {
    return (record['data'] as Record<string, unknown>)['token'] as string
  }
  return null
}

function extractEntity(payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload
  const record = payload as Record<string, unknown>
  if ('data' in record && record['data'] !== undefined && !Array.isArray(record['data'])) return record['data']
  if ('user' in record && record['user'] !== undefined) return record['user']
  return payload
}

function relayResponse(response: Response) {
  // Stream through (no buffering) — required for Workers memory limits.
  return new Response(response.body, {
    status: response.status,
    headers: filterResponseHeaders(response.headers),
  })
}

function filterResponseHeaders(headers: Headers) {
  const next = new Headers()
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase()
    if (['content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'].includes(lower)) {
      continue
    }
    next.set(key, value)
  }
  return next
}
