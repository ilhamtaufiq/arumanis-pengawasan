import Constants from 'expo-constants'
import { Platform } from 'react-native'
import {
  DEVELOPMENT_API_BASE,
  PRODUCTION_API_BASE,
  formatNetworkFailureMessage as formatNetworkFailure,
  resolveApiBaseUrl,
} from '@/lib/api-endpoints'

export { DEVELOPMENT_API_BASE, PRODUCTION_API_BASE, isDevApiUrl } from '@/lib/api-endpoints'

type ExpoExtra = { apiBaseUrl?: string }

function readExpoExtra(): ExpoExtra | undefined {
  const config = Constants.expoConfig ?? (Constants as { manifest2?: { extra?: ExpoExtra } }).manifest2
  return config?.extra as ExpoExtra | undefined
}

/**
 * Base URL Laravel API (sama upstream dengan www/bun BFF).
 * Local: http://apiamis.test/api
 * Production: https://apiamis.cianjur.space/api
 */
export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    devMode: __DEV__,
    envUrl: process.env.EXPO_PUBLIC_APIAMIS_BASE_URL,
    extraUrl: readExpoExtra()?.apiBaseUrl,
  })
}

export function formatNetworkFailureMessage(error: unknown, action = 'Terhubung ke server') {
  return formatNetworkFailure(error, getApiBaseUrl(), action)
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