import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { resolveRootRedirectLocation } from './lib/sso-token'

const API_BASE = (Bun.env.APIAMIS_BASE_URL || 'http://apiamis.test/api').replace(/\/$/, '')
const PORT = Number(Bun.env.PORT || '3000')
const COOKIE_NAME = Bun.env.SESSION_COOKIE_NAME || 'pengawas_session'
const COOKIE_SECURE = `${Bun.env.SESSION_COOKIE_SECURE || 'false'}` === 'true'
const rawCookiePath = Bun.env.SESSION_COOKIE_PATH
const COOKIE_PATH = (rawCookiePath != null && rawCookiePath !== '' ? rawCookiePath : '/pengawasan').replace(/\/$/, '') || '/'
const rawBase = Bun.env.APP_PUBLIC_BASE_PATH
const PUBLIC_BASE_PATH = (rawBase != null && rawBase !== '' ? rawBase : '/pengawasan').replace(/\/$/, '')
const DIST_DIR = resolve(process.cwd(), 'dist')

const app = new Hono()

const isProd = Bun.env.BUN_ENV === 'production' || Bun.env.NODE_ENV === 'production'

// Avoid root->base redirect in production. In stripping-proxy deploys (common for subpath),
// the server sees '/' for the mounted app entrypoint; redirecting to PUBLIC_BASE_PATH
// causes ERR_TOO_MANY_REDIRECTS. Dev still gets the convenience redirect.
if (!isProd) {
  const redirectRoot = (c: Context) => {
    const url = new URL(c.req.url)
    const location = resolveRootRedirectLocation(
      PUBLIC_BASE_PATH || '/',
      url.pathname,
      url.search.slice(1),
    )
    return c.redirect(location)
  }

  app.get('/', redirectRoot)
  if (PUBLIC_BASE_PATH && PUBLIC_BASE_PATH !== '/') {
    app.get(`${PUBLIC_BASE_PATH}`, redirectRoot)
  }
}

for (const prefix of ['', PUBLIC_BASE_PATH]) {
  app.get(`${prefix}/health`, (c) => {
    const payload: Record<string, string | boolean> = {
      ok: true,
      env: Bun.env.BUN_ENV || 'development',
      now: new Date().toISOString(),
    }

    if (!isProd) {
      payload.apiBase = API_BASE
    }

    return c.json(payload)
  })

  app.get(`${prefix}/oauth-callback`, (c) => {
    const url = new URL(c.req.url)
    const loginPath = PUBLIC_BASE_PATH ? `${PUBLIC_BASE_PATH}/login` : '/login'
    url.pathname = loginPath
    return c.redirect(url.toString())
  })

  app.post(`${prefix}/bff/auth/login`, async (c) => {
    if (isProd) {
      return c.json({ message: 'Login lokal dinonaktifkan. Gunakan SSO Arumanis.' }, 403)
    }

    try {
      const body = await safeJsonBody(c)
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      })

      const payload = await safeParseResponse(response)

      if (!response.ok) {
        return c.json(payload ?? { message: 'Login gagal' }, response.status as any)
      }

      const token = extractToken(payload)
      if (token) {
        setCookie(c, COOKIE_NAME, token, {
          httpOnly: true,
          secure: COOKIE_SECURE,
          sameSite: 'Strict',
          path: COOKIE_PATH,
        })
      }

      return c.json({
        user: extractEntity(payload?.user ?? payload?.data?.user ?? payload?.data ?? payload),
      })
    } catch {
      return c.json({ message: 'Login gagal' }, 500)
    }
  })

  app.post(`${prefix}/bff/auth/sync-token`, async (c) => {
    const body = await safeJsonBody(c)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return c.json({ message: 'Token tidak valid' }, 400)
    }

    const verified = await verifyToken(token)
    if (!verified.ok) {
      return c.json({ message: 'Token tidak valid atau kedaluwarsa' }, 401)
    }

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'Strict',
      path: COOKIE_PATH,
    })

    return c.json({ message: 'Sesi disinkronkan', user: verified.user })
  })

  app.post(`${prefix}/bff/auth/exchange-handoff`, async (c) => {
    const body = await safeJsonBody(c)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    if (!code) {
      return c.json({ message: 'Kode handoff tidak valid' }, 400)
    }

    try {
      const response = await fetch(`${API_BASE}/auth/handoff/exchange`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const payload = await safeParseResponse(response)
      if (!response.ok) {
        return c.json(payload ?? { message: 'Handoff gagal' }, response.status as any)
      }

      const token = extractToken(payload)
      if (!token) {
        return c.json({ message: 'Token handoff tidak ditemukan' }, 500)
      }

      setCookie(c, COOKIE_NAME, token, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'Strict',
        path: COOKIE_PATH,
      })

      return c.json({
        user: extractEntity((payload as any)?.user ?? payload),
        message: 'Sesi SSO berhasil disinkronkan',
      })
    } catch {
      return c.json({ message: 'Handoff service unavailable' }, 502)
    }
  })

  app.get(`${prefix}/bff/auth/me`, async (c) => {
    const response = await forwardAuthRequest(c, `${API_BASE}/auth/me`, 'GET')
    return response
  })

  app.post(`${prefix}/bff/auth/logout`, async (c) => {
    const response = await forwardAuthRequest(c, `${API_BASE}/auth/logout`, 'POST')
    deleteCookie(c, COOKIE_NAME, { path: COOKIE_PATH })
    if (response instanceof Response) {
      return response
    }
    return c.json({ message: 'Logged out' })
  })

  app.post(`${prefix}/bff/broadcasting/auth`, async (c) => {
    const token = getCookie(c, COOKIE_NAME)
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
      const response = await fetch(`${API_BASE}/broadcasting/auth`, {
        method: 'POST',
        headers,
        body: await c.req.arrayBuffer(),
      })
      return relayResponse(response)
    } catch {
      return c.json({ message: 'Upstream API tidak tersedia' }, 502)
    }
  })

  app.all(`${prefix}/bff/api/*`, async (c) => {
    const path = normalizeRequestPath(c.req.path)
    const targetPath = (path.replace(/^\/bff\/api/, '') || '/').replace(/^\//, '')
    const target = new URL(targetPath, `${API_BASE}/`)
    target.search = new URL(c.req.url).search

    const headers = new Headers()
    headers.set('Accept', 'application/json')
    const incomingContentType = c.req.header('content-type')
    if (incomingContentType) {
      headers.set('Content-Type', incomingContentType)
    }

    const token = getCookie(c, COOKIE_NAME)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const body = ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.arrayBuffer()
    const init: RequestInit = {
      method: c.req.method,
      headers,
    }
    if (body !== undefined) {
      init.body = body
    }

    try {
      const response = await fetch(target, init)
      return relayResponse(response)
    } catch {
      return c.json({ message: 'Upstream API tidak tersedia' }, 502)
    }
  })
}

app.get('*', async (c) => {
  const requestPath = normalizeRequestPath(c.req.path)
  const filePath = requestPath === '/' ? resolve(DIST_DIR, 'index.html') : resolve(DIST_DIR, `.${requestPath}`)
  const extension = extname(requestPath).toLowerCase()

  if (requestPath !== '/' && extension && existsSync(filePath)) {
    return new Response(Bun.file(filePath), {
      headers: {
        'content-type': contentTypeFor(filePath),
        ...cacheHeadersFor(requestPath),
      },
    })
  }

  // Missing hashed chunks must 404 — never fall back to index.html (causes MIME type errors).
  if (extension && isStaticAssetExtension(extension)) {
    return c.text('Not Found', 404)
  }

  const indexPath = resolve(DIST_DIR, 'index.html')
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        ...cacheHeadersFor('/index.html'),
      },
    })
  }

  return c.text('Build output not found. Run `bun run build` first.', 404)
})

Bun.serve({
  hostname: '0.0.0.0',
  port: PORT,
  fetch: app.fetch,
})

console.log(`Pengawas server running on http://127.0.0.1:${PORT}`)

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

function normalizeRequestPath(pathname: string) {
  if (!PUBLIC_BASE_PATH || !pathname.startsWith(PUBLIC_BASE_PATH)) {
    return pathname
  }

  const trimmed = pathname.slice(PUBLIC_BASE_PATH.length)
  if (!trimmed) {
    return '/'
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

async function forwardAuthRequest(c: Context, target: string, method: string) {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ message: 'Unauthenticated' }, 401 as any)
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
      return c.json(payload ?? { message: 'Request failed' }, response.status as any)
    }

    if (method === 'POST' && target.endsWith('/auth/logout')) {
      deleteCookie(c, COOKIE_NAME, { path: COOKIE_PATH })
    }

    const body = payload as any
    return c.json({
      user: extractEntity(body?.data ?? body),
      message: body?.message,
    })
  } catch {
    return c.json({ message: 'Auth service unavailable' }, 502)
  }
}

async function verifyToken(token: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
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

    return {
      ok: true as const,
      user: extractEntity(payload),
    }
  } catch {
    return { ok: false as const, user: null }
  }
}

function extractToken(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (typeof record.token === 'string') return record.token
  if (record.data && typeof record.data === 'object' && typeof (record.data as Record<string, unknown>).token === 'string') {
    return (record.data as Record<string, unknown>).token as string
  }
  return null
}

function extractEntity(payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload
  const record = payload as Record<string, unknown>
  if ('data' in record && record.data !== undefined && !Array.isArray(record.data)) return record.data
  if ('user' in record && record.user !== undefined) return record.user
  return payload
}

function relayResponse(response: Response) {
  return response.arrayBuffer().then((body) => new Response(body, {
    status: response.status,
    headers: filterResponseHeaders(response.headers),
  }))
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

function cacheHeadersFor(requestPath: string): Record<string, string> {
  const normalized = requestPath.toLowerCase()

  if (
    normalized === '/'
    || normalized.endsWith('.html')
    || normalized.endsWith('/index.html')
    || normalized.endsWith('version.json')
  ) {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }
  }

  if (extname(normalized)) {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
  }

  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

function isStaticAssetExtension(extension: string) {
  return ['.js', '.mjs', '.css', '.map', '.json', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot'].includes(extension)
}

function contentTypeFor(filePath: string) {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}
