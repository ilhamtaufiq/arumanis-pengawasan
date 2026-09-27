import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { createApp, normalizeRequestPath } from './app'

const PORT = Number(Bun.env.PORT || '3000')
const rawBase = Bun.env.APP_PUBLIC_BASE_PATH
const PUBLIC_BASE_PATH = (rawBase != null && rawBase !== '' ? rawBase : '/pengawasan').replace(/\/$/, '')
const DIST_DIR = resolve(process.cwd(), 'dist')

const app = createApp()

// Bun-only static file serving (Workers uses ASSETS binding in worker.ts).
app.get('*', async (c) => {
  const requestPath = normalizeRequestPath(new URL(c.req.url).pathname, PUBLIC_BASE_PATH)
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
