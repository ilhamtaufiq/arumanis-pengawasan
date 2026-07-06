import Constants from 'expo-constants'

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
 * Deep link callback OAuth mobile — harus selaras dengan MOBILE_OAUTH_CALLBACK_URL di apiamis.
 * Web Arumanis tetap memakai FRONTEND_URL/oauth-callback (tanpa ?platform=mobile).
 */
export function getMobileOAuthCallbackUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, '')
  }

  return 'pengawas://oauth-callback'
}