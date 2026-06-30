import { describe, expect, test } from 'bun:test'
import { ApiError } from '@/lib/api'
import {
  backoffDelayMs,
  isRetriableUploadError,
  shouldQueueAfterFailedUpload,
} from '@/lib/resilient-foto-upload'

describe('resilient-foto-upload', () => {
  test('backoffDelayMs grows exponentially with cap', () => {
    expect(backoffDelayMs(1)).toBe(1000)
    expect(backoffDelayMs(2)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(4000)
    expect(backoffDelayMs(10)).toBe(16000)
  })

  test('isRetriableUploadError treats network and 5xx as retriable', () => {
    expect(isRetriableUploadError(new ApiError('server', 500, null))).toBe(true)
    expect(isRetriableUploadError(new ApiError('timeout', 408, null))).toBe(true)
    expect(isRetriableUploadError(new ApiError('rate limit', 429, null))).toBe(true)
    expect(isRetriableUploadError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetriableUploadError(new Error('network error while uploading'))).toBe(true)
  })

  test('isRetriableUploadError rejects validation errors', () => {
    expect(isRetriableUploadError(new ApiError('bad request', 422, null))).toBe(false)
    expect(isRetriableUploadError(new ApiError('forbidden', 403, null))).toBe(false)
  })

  test('shouldQueueAfterFailedUpload mirrors retriable errors', () => {
    expect(shouldQueueAfterFailedUpload(new ApiError('server', 503, null))).toBe(true)
    expect(shouldQueueAfterFailedUpload(new ApiError('validation', 422, null))).toBe(false)
  })
})