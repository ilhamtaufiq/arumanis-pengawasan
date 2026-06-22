import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const PUBLIC_BASE = '/pengawasan'

function redirectRootToBase(): Plugin {
  return {
    name: 'redirect-root-to-base',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        const [pathname, search = ''] = url.split('?')
        const query = search ? `?${search}` : ''

        if (pathname === '/' || pathname === '') {
          res.writeHead(302, { Location: `${PUBLIC_BASE}/${query}` })
          res.end()
          return
        }

        if (pathname === PUBLIC_BASE) {
          res.writeHead(302, { Location: `${PUBLIC_BASE}/${query}` })
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
  plugins: [react(), redirectRootToBase()],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
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
