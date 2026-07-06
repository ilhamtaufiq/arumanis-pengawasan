import { Component, type ErrorInfo, type ReactNode } from 'react'
import { DebugErrorPanel } from '@/components/DebugErrorPanel'

type ScreenErrorBoundaryProps = {
  children: ReactNode
  scope: string
  extra?: Record<string, string | number | boolean | null | undefined>
  showHomeAction?: boolean
}

type ScreenErrorBoundaryState = {
  error: Error | null
}

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ScreenErrorBoundary:${this.props.scope}]`, error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <DebugErrorPanel
          error={this.state.error}
          scope={this.props.scope}
          extra={this.props.extra}
          onRetry={this.handleRetry}
          showHomeAction={this.props.showHomeAction}
        />
      )
    }

    return this.props.children
  }
}