export const DEFAULT_UPLOAD_MAX_ATTEMPTS = 3

export function backoffDelayMs(attempt: number): number {
  const base = 1000
  const cappedAttempt = Math.max(1, Math.min(attempt, 5))
  return base * 2 ** (cappedAttempt - 1)
}

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null
  const status = Number((error as { status: unknown }).status)
  return Number.isFinite(status) ? status : null
}

export function isRetriableUploadError(error: unknown): boolean {
  const status = readErrorStatus(error)
  if (status !== null) {
    if (status === 0 || status === 408 || status === 429) return true
    return status >= 500
  }

  if (error instanceof TypeError) return true

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network')
      || message.includes('failed to fetch')
      || message.includes('load failed')
      || message.includes('timeout')
      || message.includes('aborted')
    )
  }

  return false
}

export function shouldQueueAfterFailedUpload(error: unknown): boolean {
  return isRetriableUploadError(error)
}