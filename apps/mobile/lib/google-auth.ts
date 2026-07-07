import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { getApiBaseUrl, getOAuthCallbackUrl } from '@/lib/config'

WebBrowser.maybeCompleteAuthSession()

type OAuthCallbackResult = {
  token?: string
  error?: string
}

function parseOAuthCallbackUrl(url: string): OAuthCallbackResult {
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')

  let params: URLSearchParams

  if (hashIndex >= 0) {
    params = new URLSearchParams(url.slice(hashIndex + 1))
  } else if (queryIndex >= 0) {
    params = new URLSearchParams(url.slice(queryIndex + 1))
  } else {
    return {}
  }

  const token = params.get('token')?.trim()
  const error = params.get('error')?.trim()

  return {
    token: token || undefined,
    error: error || undefined,
  }
}

async function fetchGoogleAuthUrl(callbackUrl: string) {
  const apiBase = getApiBaseUrl()
  const params = new URLSearchParams({
    platform: 'mobile',
    callback_url: callbackUrl,
  })

  const response = await fetch(`${apiBase}/auth/google?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Gagal memuat halaman login Google'
    throw new Error(message)
  }

  if (!payload || typeof payload !== 'object' || typeof (payload as { url?: unknown }).url !== 'string') {
    throw new Error('URL login Google tidak valid')
  }

  return (payload as { url: string }).url
}

/**
 * OAuth Google untuk app pengawas.
 * Native: in-app browser + deep link pengawas://oauth-callback
 * Web: full redirect ke /oauth-callback di origin yang sama (bukan portal Arumanis)
 */
export async function signInWithGoogle(): Promise<string> {
  const callbackUrl = getOAuthCallbackUrl()
  const authUrl = await fetchGoogleAuthUrl(callbackUrl)

  if (Platform.OS === 'web') {
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.location.assign(authUrl)
    }
    return new Promise<string>(() => {
      // Halaman akan redirect; token diproses di /oauth-callback.
    })
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl)

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Login Google dibatalkan')
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Login Google gagal')
  }

  const { token, error } = parseOAuthCallbackUrl(result.url)

  if (error) {
    throw new Error(error)
  }

  if (!token) {
    throw new Error('Token tidak diterima dari Google')
  }

  return token
}

export function parseOAuthCallbackFromLocation(): OAuthCallbackResult {
  if (Platform.OS !== 'web' || typeof globalThis.window === 'undefined') {
    return {}
  }

  const { href } = globalThis.window.location
  return parseOAuthCallbackUrl(href)
}