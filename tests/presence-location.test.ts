import { describe, expect, test } from 'bun:test'
import {
  PRESENCE_LOCATION_MIN_INTERVAL_MS,
  shouldSendPresenceLocation,
} from '@pengawas/shared/presence-location'

describe('presence location throttle', () => {
  test('sends first sample immediately', () => {
    expect(shouldSendPresenceLocation(1_000, null)).toBe(true)
  })

  test('blocks samples inside interval window', () => {
    const now = 120_000
    const last = now - PRESENCE_LOCATION_MIN_INTERVAL_MS + 1
    expect(shouldSendPresenceLocation(now, last)).toBe(false)
  })

  test('allows sample after interval window', () => {
    const now = 120_000
    const last = now - PRESENCE_LOCATION_MIN_INTERVAL_MS
    expect(shouldSendPresenceLocation(now, last)).toBe(true)
  })
})