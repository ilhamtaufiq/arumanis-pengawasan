import type { Foto } from '@pengawas/shared'
import {
  backoffDelayMs,
  DEFAULT_UPLOAD_MAX_ATTEMPTS,
  isRetriableUploadError,
  shouldQueueAfterFailedUpload,
} from '@pengawas/shared/foto-upload-resilience'
import { createFotoWithProgress, type CreateFotoProgress } from '@/lib/create-foto-with-progress'

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
    onProgress?: (progress: CreateFotoProgress) => void
  },
): Promise<Foto> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_UPLOAD_MAX_ATTEMPTS
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options?.onAttempt?.(attempt)

    try {
      return await createFotoWithProgress(formData, options?.onProgress)
    } catch (error) {
      lastError = error
      const canRetry = isRetriableUploadError(error) && attempt < maxAttempts
      if (!canRetry) break
      // Reset progress visual between retries
      options?.onProgress?.({ percent: 0, loaded: 0, total: null })
      await sleep(backoffDelayMs(attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gagal mengunggah foto')
}
