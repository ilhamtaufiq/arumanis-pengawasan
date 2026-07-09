import { describe, expect, test } from 'bun:test'
import {
  DEVELOPMENT_API_BASE,
  PRODUCTION_API_BASE,
  isDevApiUrl,
  resolveApiBaseUrl,
} from '../apps/mobile/lib/api-endpoints'

describe('mobile api config', () => {
  test('flags local development hosts', () => {
    expect(isDevApiUrl('http://apiamis.test/api')).toBe(true)
    expect(isDevApiUrl('https://apiamis.cianjur.space/api')).toBe(false)
  })

  test('uses production base in release builds', () => {
    expect(
      resolveApiBaseUrl({
        devMode: false,
        envUrl: 'http://apiamis.test/api',
        extraUrl: 'http://apiamis.test/api',
      }),
    ).toBe(PRODUCTION_API_BASE)
  })

  test('uses development base in dev builds when env is local', () => {
    expect(
      resolveApiBaseUrl({
        devMode: true,
        envUrl: DEVELOPMENT_API_BASE,
      }),
    ).toBe(DEVELOPMENT_API_BASE)
  })
})