import { type ErrorBoundaryProps } from 'expo-router'
import { ScreenErrorFallback } from '@/components/ScreenErrorFallback'

export function createRouteErrorBoundary(scope: string, showHomeAction = true) {
  return function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    return (
      <ScreenErrorFallback
        error={error}
        onRetry={retry}
        scope={scope}
        showHomeAction={showHomeAction}
      />
    )
  }
}