import Constants from 'expo-constants'
import { Platform } from 'react-native'

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined

/**
 * Base URL Laravel API (sama upstream dengan www/bun BFF).
 * Local: http://apiamis.test/api
 * Production: https://apiamis.cianjur.space/api
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_APIAMIS_BASE_URL
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '')
  }

  if (extra?.apiBaseUrl) {
    return extra.apiBaseUrl.replace(/\/$/, '')
  }

  return 'http://apiamis.test/api'
}

/**
 * Callback OAuth untuk app pengawas.
 * Native: deep link pengawas://oauth-callback
 * Web: origin app saat ini + /oauth-callback (bukan portal Arumanis)
 */
export function getOAuthCallbackUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, '')
  }

  if (Platform.OS === 'web' && typeof globalThis.window !== 'undefined') {
    return `${globalThis.window.location.origin}/oauth-callback`
  }

  return 'pengawas://oauth-callback'
}

/** @deprecated Gunakan getOAuthCallbackUrl */
export function getMobileOAuthCallbackUrl() {
  return getOAuthCallbackUrl()
}