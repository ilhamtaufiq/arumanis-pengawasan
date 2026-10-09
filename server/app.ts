import { Hono, type Context } from 'hono'
import { resolveRootRedirectLocation } from './lib/sso-token'

export interface AppEnv {
  APIAMIS_BASE_URL?: string
  PORT?: string
  APP_PUBLIC_BASE_PATH?: string
  BUN_ENV?: string
  NODE_ENV?: string
}

interface RequestConfig {
  apiBase: string
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
  const rawBase = get('APP_PUBLIC_BASE_PATH')
  const publicBasePath = (rawBase !== '' ? rawBase : '/pengawasan').replace(/\/$/, '')
  const bunEnv = get('BUN_ENV')
  const nodeEnv = get('NODE_ENV')
  const isProd = bunEnv === 'production' || nodeEnv === 'production'

  return { apiBase, publicBasePath, isProd }
}

export function normalizeRequestPath(pathname: string, publicBasePath: string): string {
  if (!publicBasePath || !pathname.startsWith(publicBasePath)) {
    return pathname
  }
  const trimmed = pathname.slice(publicBasePath.length)
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Server hanya melayani health check, redirect OAuth, dan (di Bun) static SPA.
 * Browser memanggil APIAMIS langsung (VITE_APIAMIS_BASE_URL); tidak ada proxy/BFF di sini.
 */
export function createApp(): Hono<{ Bindings: AppEnv }> {
  const app = new Hono<{ Bindings: AppEnv }>()

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

    return next()
  })

  return app
}

/** Match request against '' or PUBLIC_BASE_PATH prefix. Returns stripped path or null. */
function matchBase(c: Context<{ Bindings: AppEnv }>, pathname: string): string | null {
  const { publicBasePath } = getConfig(c)
  if (pathname === '/health' || pathname === '/oauth-callback') {
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

function readBindingOrGlobal(c: Context<{ Bindings: AppEnv }>, key: keyof AppEnv): string {
  const fromBinding = (c.env as AppEnv | undefined)?.[key]
  if (fromBinding != null && fromBinding !== '') return fromBinding
  return readGlobalEnv(key) ?? ''
}
