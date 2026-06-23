import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/App'
import { AppUpdateOverlay } from '@/components/AppUpdateOverlay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'
import { hardReloadApp, isChunkLoadError } from '@/lib/app-cache'
import '@/styles/globals.css'

if (import.meta.env.PROD) {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      void hardReloadApp()
    }
  })
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

