import { DebugErrorPanel } from '@/components/DebugErrorPanel'

type ScreenErrorFallbackProps = {
  error: Error
  onRetry: () => void
  scope?: string
  showHomeAction?: boolean
}

export function ScreenErrorFallback({
  error,
  onRetry,
  scope = 'Layar',
  showHomeAction = true,
}: ScreenErrorFallbackProps) {
  return (
    <DebugErrorPanel
      error={error}
      scope={scope}
      onRetry={onRetry}
      showHomeAction={showHomeAction}
    />
  )
}