import { describe, expect, it } from 'bun:test'
import { getUmamiConfig, isUmamiEnabled } from '../src/lib/analytics/umami'

describe('umami config', () => {
  const originalScriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
  const originalWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  const originalDomains = import.meta.env.VITE_UMAMI_DOMAINS

  it('returns null when env is incomplete', () => {
    import.meta.env.VITE_UMAMI_SCRIPT_URL = ''
    import.meta.env.VITE_UMAMI_WEBSITE_ID = ''

    expect(getUmamiConfig()).toBeNull()
    expect(isUmamiEnabled()).toBe(false)

    import.meta.env.VITE_UMAMI_SCRIPT_URL = originalScriptUrl
    import.meta.env.VITE_UMAMI_WEBSITE_ID = originalWebsiteId
    import.meta.env.VITE_UMAMI_DOMAINS = originalDomains
  })

  it('returns config when script url and website id are set', () => {
    import.meta.env.VITE_UMAMI_SCRIPT_URL = 'https://umami.example.com/script.js'
    import.meta.env.VITE_UMAMI_WEBSITE_ID = 'abc-123'
    import.meta.env.VITE_UMAMI_DOMAINS = 'arumanis.cianjur.space'

    expect(getUmamiConfig()).toEqual({
      scriptUrl: 'https://umami.example.com/script.js',
      websiteId: 'abc-123',
      domains: 'arumanis.cianjur.space',
    })
    expect(isUmamiEnabled()).toBe(true)

    import.meta.env.VITE_UMAMI_SCRIPT_URL = originalScriptUrl
    import.meta.env.VITE_UMAMI_WEBSITE_ID = originalWebsiteId
    import.meta.env.VITE_UMAMI_DOMAINS = originalDomains
  })
})