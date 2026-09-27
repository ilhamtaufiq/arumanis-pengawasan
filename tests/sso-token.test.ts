import { describe, expect, it } from 'bun:test'
import {
  getPengawasPublicPath,
  getSsoTokenFromSearch,
  isSsoBootstrapPath,
  normalizeBearerToken,
  resolveLoginRedirectTarget,
  resolveRootRedirectLocation,
  sanitizeLocationUrl,
  stripSsoTokenFromPath,
  stripSsoTokenFromSearch,
} from '../src/lib/sso-token'

describe('sso-token helpers', () => {
  it('reads and strips token params', () => {
    expect(getSsoTokenFromSearch('?token=abc&foo=1')).toBe('abc')
    expect(stripSsoTokenFromSearch('?token=abc&foo=1')).toBe('?foo=1')
    expect(stripSsoTokenFromPath('/pekerjaan?token=abc')).toBe('/pekerjaan')
  })

  it('normalizes json-wrapped bearer token', () => {
    expect(normalizeBearerToken('"272|abc"')).toBe('272|abc')
    expect(normalizeBearerToken('272|abc')).toBe('272|abc')
  })

  it('builds pengawas public path without sso token params', () => {
    expect(getPengawasPublicPath('/pekerjaan', '?token=abc&foo=1')).toBe('/pekerjaan?foo=1')
    expect(getPengawasPublicPath('/')).toBe('/')
  })

  it('keeps public path idempotent when base prefix already present', () => {
    // window.location.pathname sudah mengandung base — jangan dobel prefix.
    expect(getPengawasPublicPath('/pengawasan/pekerjaan')).toBe('/pengawasan/pekerjaan')
  })

  it('resolves login redirect target inside router basename', () => {
    // Full public path dari issuer dikupas ke path relatif router.
    expect(resolveLoginRedirectTarget('/pengawasan/pekerjaan/5', '/pengawasan')).toBe('/pekerjaan/5')
    expect(resolveLoginRedirectTarget('/pengawasan', '/pengawasan')).toBe('/')
    expect(resolveLoginRedirectTarget('/pekerjaan/5', '/pengawasan')).toBe('/pekerjaan/5')
    expect(resolveLoginRedirectTarget('/', '/pengawasan')).toBe('/')
    // Tolak open-redirect dan input aneh.
    expect(resolveLoginRedirectTarget('https://evil.test/x', '/pengawasan')).toBe('/')
    expect(resolveLoginRedirectTarget('//evil.test/x', '/pengawasan')).toBe('/')
    expect(resolveLoginRedirectTarget('', '/pengawasan')).toBe('/')
    expect(resolveLoginRedirectTarget(null, '/pengawasan')).toBe('/')
    // Deploy root: tanpa pengupasan.
    expect(resolveLoginRedirectTarget('/pekerjaan/5', '/')).toBe('/pekerjaan/5')
  })

  it('detects sso bootstrap paths', () => {
    expect(isSsoBootstrapPath('/login')).toBe(true)
    expect(isSsoBootstrapPath('/pengawasan/sign-in')).toBe(true)
    expect(isSsoBootstrapPath('/pekerjaan')).toBe(false)
  })

  it('routes root token redirects through login bootstrap', () => {
    expect(resolveRootRedirectLocation('/pengawasan', '/', 'token=abc')).toBe('/pengawasan/login?token=abc')
    expect(resolveRootRedirectLocation('/pengawasan', '/pengawasan', 'token=abc&foo=1')).toBe('/pengawasan/login?token=abc')
    expect(resolveRootRedirectLocation('/pengawasan', '/', 'foo=1')).toBe('/pengawasan/')
  })

  it('sanitizes reload urls by stripping token outside bootstrap routes', () => {
    const dashboard = sanitizeLocationUrl(new URL('http://localhost/pengawasan/?token=abc&foo=1'))
    expect(dashboard.pathname).toBe('/pengawasan/')
    expect(dashboard.search).toBe('?foo=1')

    const login = sanitizeLocationUrl(new URL('http://localhost/pengawasan/login?access_token=abc'))
    expect(login.pathname).toBe('/pengawasan/login')
    expect(login.search).toBe('?token=abc')
  })
})