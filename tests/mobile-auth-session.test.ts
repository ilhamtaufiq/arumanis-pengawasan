import { describe, expect, test } from 'bun:test'
import { ApiError } from '../packages/api-client/src/core'
import {
  isSessionInvalidError,
  readAuthErrorStatus,
} from '../apps/mobile/lib/auth-session'

describe('auth-session', () => {
  test('readAuthErrorStatus returns status for ApiError', () => {
    expect(readAuthErrorStatus(new ApiError('Unauthorized', 401, null))).toBe(401)
    expect(readAuthErrorStatus(new Error('network'))).toBeNull()
  })

  test('isSessionInvalidError only matches 401 and 403', () => {
    expect(isSessionInvalidError(new ApiError('Unauthorized', 401, null))).toBe(true)
    expect(isSessionInvalidError(new ApiError('Forbidden', 403, null))).toBe(true)
    expect(isSessionInvalidError(new ApiError('Server error', 500, null))).toBe(false)
    expect(isSessionInvalidError(new Error('offline'))).toBe(false)
  })
})