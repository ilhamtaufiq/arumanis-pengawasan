import { useEffect } from 'react'
import { type ErrorBoundaryProps } from 'expo-router'
import { ScreenErrorFallback } from '@/components/ScreenErrorFallback'
import { reportUnknownError } from '@/lib/client-error-reporting'

export function createRouteErrorBoundary(scope: string, showHomeAction = true) {
  return function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    useEffect(() => {
      reportUnknownError('react', error, {
        metadata: { scope, surface: 'route-error-boundary' },
      })
    }, [error])

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