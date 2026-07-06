import { describe, expect, it } from 'bun:test'
import {
  backoffDelayMs,
  isRetriableUploadError,
  shouldQueueAfterFailedUpload,
} from '@pengawas/shared/foto-upload-resilience'

describe('foto upload resilience', () => {
  it('detects retriable HTTP statuses', () => {
    expect(isRetriableUploadError({ status: 0, message: 'offline' })).toBe(true)
    expect(isRetriableUploadError({ status: 503, message: 'server' })).toBe(true)
    expect(isRetriableUploadError({ status: 422, message: 'validation' })).toBe(false)
  })

  it('queues only after retriable failures', () => {
    expect(shouldQueueAfterFailedUpload(new TypeError('Network request failed'))).toBe(true)
    expect(shouldQueueAfterFailedUpload(new Error('Validasi gagal'))).toBe(false)
  })

  it('backs off exponentially with cap', () => {
    expect(backoffDelayMs(1)).toBe(1000)
    expect(backoffDelayMs(3)).toBe(4000)
    expect(backoffDelayMs(9)).toBe(16000)
  })
})