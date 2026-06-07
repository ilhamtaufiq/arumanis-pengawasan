import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/pengawasan/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
