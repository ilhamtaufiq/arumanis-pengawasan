import { createApp, type AppEnv } from './server/app'

const app = createApp()

interface WorkerEnv extends AppEnv {
  ASSETS?: { fetch: (req: Request) => Promise<Response> }
}

const API_PREFIXES = ['/bff/', '/health', '/oauth-callback']
const STATIC_EXTENSIONS = new Set([
  '.js', '.mjs', '.css', '.map', '.json', '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot',
])

function isApiPath(pathname: string, base: string): boolean {
  if (API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true
  if (base && base !== '/' && (pathname === base || pathname.startsWith(`${base}/`))) {
    const stripped = pathname.slice(base.length) || '/'
    if (API_PREFIXES.some((p) => stripped === p || stripped.startsWith(p))) return true
  }
  return false
}

function assetLookupPath(pathname: string, base: string): string {
  // dist/ is built with base /pengawasan/. ASSETS mirrors dist/ at root,
  // so strip the mount prefix for asset lookup.
  if (base && base !== '/' && (pathname === base || pathname.startsWith(`${base}/`))) {
    const stripped = pathname.slice(base.length) || '/'
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }
  return pathname
}

function hasStaticExtension(pathname: string): boolean {
  const dot = pathname.lastIndexOf('.')
  const slash = pathname.lastIndexOf('/')
  if (dot < 0 || dot < slash) return false
  return STATIC_EXTENSIONS.has(pathname.slice(dot).toLowerCase())
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url)
    const base = (env.APP_PUBLIC_BASE_PATH ?? '/pengawasan').replace(/\/$/, '')

    // API/BFF always goes to Hono (same behavior as Bun adapter).
    if (isApiPath(url.pathname, base)) {
      return app.fetch(request, env, undefined as never)
    }

    // Static assets via Workers Assets binding.
    const assets = env.ASSETS
    if (assets?.fetch) {
      const lookup = assetLookupPath(url.pathname, base)
      if (lookup !== url.pathname || lookup === '/' || hasStaticExtension(lookup)) {
        const assetUrl = new URL(lookup + url.search, url.origin)
        const assetRes = await assets.fetch(new Request(assetUrl.toString(), request))
        if (assetRes.status !== 404) return assetRes
        // Missing hashed chunks must 404, never SPA-fallback (avoids MIME errors).
        if (lookup !== '/' && hasStaticExtension(lookup)) {
          return new Response('Not Found', { status: 404 })
        }
      } else if (url.pathname === '/' || url.pathname === base) {
        const assetUrl = new URL('/index.html', url.origin)
        const assetRes = await assets.fetch(new Request(assetUrl.toString(), request))
        if (assetRes.status !== 404) return assetRes
      }
      // SPA fallback: serve index.html for app routes.
      const fallback = await assets.fetch(new Request(new URL('/index.html', url.origin).toString()))
      if (fallback.status !== 404) {
        return new Response(fallback.body, {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    return app.fetch(request, env, undefined as never)
  },
}
