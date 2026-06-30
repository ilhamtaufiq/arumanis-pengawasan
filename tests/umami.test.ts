import { describe, expect, it } from 'bun:test'
import { getUmamiConfig, isUmamiEnabled } from '../src/lib/analytics/umami'

describe('umami config', () => {
  it('returns null when env is incomplete', () => {
    expect(getUmamiConfig({})).toBeNull()
    expect(getUmamiConfig({ VITE_UMAMI_SCRIPT_URL: 'https://umami.example.com/script.js' })).toBeNull()
    expect(isUmamiEnabled({})).toBe(false)
  })

  it('returns config when script url and website id are set', () => {
    const env = {
      VITE_UMAMI_SCRIPT_URL: 'https://umami.example.com/script.js',
      VITE_UMAMI_WEBSITE_ID: 'abc-123',
      VITE_UMAMI_DOMAINS: 'arumanis.cianjur.space',
    }

    expect(getUmamiConfig(env)).toEqual({
      scriptUrl: 'https://umami.example.com/script.js',
      websiteId: 'abc-123',
      domains: 'arumanis.cianjur.space',
    })
    expect(isUmamiEnabled(env)).toBe(true)
  })

  it('omits domains when not configured', () => {
    expect(
      getUmamiConfig({
        VITE_UMAMI_SCRIPT_URL: 'https://umami.example.com/script.js',
        VITE_UMAMI_WEBSITE_ID: 'abc-123',
      }),
    ).toEqual({
      scriptUrl: 'https://umami.example.com/script.js',
      websiteId: 'abc-123',
    })
  })
})