import { Component, type ErrorInfo, type ReactNode } from 'react'
import { hardReloadApp, isChunkLoadError } from '@/lib/app-cache'
import { ErrorPage } from '@/pages/ErrorPage'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isChunkLoadError(error)) {
      void hardReloadApp()
      return
    }

    console.error('Pengawas render error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage />
    }

    return this.props.children
  }
}