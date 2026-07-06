import type { Foto } from '@pengawas/shared'
import {
  backoffDelayMs,
  DEFAULT_UPLOAD_MAX_ATTEMPTS,
  isRetriableUploadError,
  shouldQueueAfterFailedUpload,
} from '@pengawas/shared/foto-upload-resilience'
import { createFoto } from '@/lib/api'

export {
  backoffDelayMs,
  DEFAULT_UPLOAD_MAX_ATTEMPTS,
  isRetriableUploadError,
  shouldQueueAfterFailedUpload,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
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