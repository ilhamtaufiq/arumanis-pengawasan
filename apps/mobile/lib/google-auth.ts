import * as WebBrowser from 'expo-web-browser'
import { getApiBaseUrl, getMobileOAuthCallbackUrl } from '@/lib/config'

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

async function fetchGoogleAuthUrl() {
  const apiBase = getApiBaseUrl()
  const response = await fetch(`${apiBase}/auth/google?platform=mobile`, {
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
 * Buka OAuth Google via in-app browser; tangkap deep link pengawas://oauth-callback#token=...
 * Backend membedakan platform=mobile agar tidak masuk halaman web Arumanis/pengawas.
 */
export async function signInWithGoogle(): Promise<string> {
  const redirectUrl = getMobileOAuthCallbackUrl()
  const authUrl = await fetchGoogleAuthUrl()

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)

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