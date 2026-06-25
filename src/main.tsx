import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/App'
import { AppUpdateOverlay } from '@/components/AppUpdateOverlay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'
import { getEmbeddedBuildInfo, hardReloadApp, isChunkLoadError, rememberBuildId } from '@/lib/app-cache'
import '@/styles/globals.css'

if (import.meta.env.PROD) {
  rememberBuildId(getEmbeddedBuildInfo().buildId)

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      void hardReloadApp()
    }
  })

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.message) || isChunkLoadError(event.error)) {
      event.preventDefault()
      void hardReloadApp()
      return
    }

    const assetPrefix = `${import.meta.env.BASE_URL}assets/`
    const target = event.target
    if (target instanceof HTMLScriptElement && target.src.includes(assetPrefix)) {
      void hardReloadApp()
      return
    }
    if (target instanceof HTMLLinkElement && target.rel === 'stylesheet' && target.href.includes(assetPrefix)) {
      void hardReloadApp()
    }
  }, true)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/pengawasan'}>
          <App />
          <AppUpdateOverlay />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)

