import { describe, expect, test } from 'bun:test'
import { queryKeys } from '../packages/shared/src/query-keys'
import { shouldPersistQueryKey } from '../apps/mobile/lib/query-persist'

describe('shouldPersistQueryKey', () => {
  test('persists auth session', () => {
    expect(shouldPersistQueryKey(queryKeys.auth.me())).toBe(true)
  })

  test('persists pekerjaan list and detail', () => {
    expect(shouldPersistQueryKey(queryKeys.pekerjaan.list({ page: 1 }))).toBe(true)
    expect(shouldPersistQueryKey(queryKeys.pekerjaan.detail(12))).toBe(true)
  })

  test('persists progress estimasi, penerima, and tiket for offline detail', () => {
    expect(shouldPersistQueryKey(queryKeys.pekerjaan.progressEstimasi(12, 2026))).toBe(true)
    expect(shouldPersistQueryKey(queryKeys.pekerjaan.penerima(12, { page: 1 }))).toBe(true)
    expect(shouldPersistQueryKey(queryKeys.tiket.list({ pekerjaanId: 12 }))).toBe(true)
  })

  test('does not persist unrelated queries', () => {
    expect(shouldPersistQueryKey(queryKeys.dashboard.stats('2026'))).toBe(false)
    expect(shouldPersistQueryKey(queryKeys.pekerjaan.media(12))).toBe(false)
    expect(shouldPersistQueryKey(queryKeys.notifications.unread())).toBe(false)
  })
})