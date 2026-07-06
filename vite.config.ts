import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveRootRedirectLocation } from './src/lib/sso-token'

const PUBLIC_BASE = '/pengawasan'
const appVersion = process.env.npm_package_version || '1.0.0'
const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const builtAt = new Date().toISOString()

function redirectRootToBase(): Plugin {
  return {
    name: 'redirect-root-to-base',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        const [pathname, search = ''] = url.split('?')

        if (pathname === '/' || pathname === '' || pathname === PUBLIC_BASE) {
          const location = resolveRootRedirectLocation(PUBLIC_BASE, pathname, search)
          res.writeHead(302, { Location: location })
          res.end()
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  base: `${PUBLIC_BASE}/`,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    redirectRootToBase(),
    {
      name: 'generate-version-json',
      transformIndexHtml(html) {
        const metaTags = `
    <meta name="app-version" content="${appVersion}" />
    <meta name="app-build-id" content="${buildId}" />
    <meta name="app-built-at" content="${builtAt}" />`

        return html.replace('</head>', `${metaTags}\n</head>`)
      },
      closeBundle() {
        writeFileSync(
          resolve(process.cwd(), 'dist/version.json'),
          JSON.stringify({ version: appVersion, buildId, builtAt }, null, 2),
        )
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
      '@pengawas/shared': resolve(process.cwd(), 'packages/shared/src/index.ts'),
      '@pengawas/shared/types': resolve(process.cwd(), 'packages/shared/src/types.ts'),
      '@pengawas/shared/format': resolve(process.cwd(), 'packages/shared/src/format.ts'),
      '@pengawas/shared/foto-status': resolve(process.cwd(), 'packages/shared/src/foto-status.ts'),
      '@pengawas/shared/query-keys': resolve(process.cwd(), 'packages/shared/src/query-keys.ts'),
      '@pengawas/api-client': resolve(process.cwd(), 'packages/api-client/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: `${PUBLIC_BASE}/`,
    proxy: {
      '/pengawasan/bff': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pengawasan/, ''),
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.tsx': 'tsx' },
      jsx: 'automatic',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
