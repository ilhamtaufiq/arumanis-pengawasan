import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const hookPath = join(import.meta.dir, '../apps/mobile/hooks/usePresenceHeartbeat.ts')

describe('usePresenceHeartbeat', () => {
  test('native apps defer presence to background location task', () => {
    const source = readFileSync(hookPath, 'utf8')
    expect(source).toContain('isBackgroundLocationPlatformSupported()')
    expect(source).toContain('background-location-task —')
    expect(source).not.toContain('resolvePresenceKoordinat')
    expect(source).not.toContain('resolveDeviceKoordinat')
  })
})