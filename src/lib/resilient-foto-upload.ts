import { ApiError, createFoto } from '@/lib/api'
import type { Foto } from '@/lib/types'

export const DEFAULT_UPLOAD_MAX_ATTEMPTS = 3

export function backoffDelayMs(attempt: number): number {
  const base = 1000
  const cappedAttempt = Math.max(1, Math.min(attempt, 5))
  return base * 2 ** (cappedAttempt - 1)
}

export function isRetriableUploadError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408 || error.status === 429) return true
    return error.status >= 500
  }

  if (error instanceof TypeError) return true

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network')
      || message.includes('failed to fetch')
      || message.includes('load failed')
      || message.includes('timeout')
    )
  }

  return false
}

export function shouldQueueAfterFailedUpload(error: unknown): boolean {
  return isRetriableUploadError(error)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function uploadFotoWithRetry(
  formData: FormData,
  options?: {
    maxAttempts?: number
    onAttempt?: (attempt: number) => void
  },
): Promise<Foto> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_UPLOAD_MAX_ATTEMPTS
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options?.onAttempt?.(attempt)

    try {
      return await createFoto(formData)
    } catch (error) {
      lastError = error
      const canRetry = isRetriableUploadError(error) && attempt < maxAttempts
      if (!canRetry) break
      await sleep(backoffDelayMs(attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gagal mengunggah foto')
}