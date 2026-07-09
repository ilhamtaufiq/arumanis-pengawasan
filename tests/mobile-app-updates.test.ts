import { afterEach, describe, expect, test } from 'bun:test'
import {
  consumeOtaReloadPending,
  isOtaReloadPending,
  markOtaReloadPending,
  resetOtaReloadPending,
  shouldDeferOtaReload,
} from '../apps/mobile/lib/ota-reload-policy'

describe('mobile app updates', () => {
  afterEach(() => {
    resetOtaReloadPending()
  })

  test('defers OTA reload while app is active', () => {
    expect(shouldDeferOtaReload('active')).toBe(true)
    expect(shouldDeferOtaReload('background')).toBe(false)
    expect(shouldDeferOtaReload('inactive')).toBe(false)
  })

  test('tracks pending OTA reload state', () => {
    expect(isOtaReloadPending()).toBe(false)
    markOtaReloadPending()
    expect(isOtaReloadPending()).toBe(true)
    expect(consumeOtaReloadPending()).toBe(true)
    expect(isOtaReloadPending()).toBe(false)
  })
})