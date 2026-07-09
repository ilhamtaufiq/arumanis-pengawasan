export const DEVELOPMENT_API_BASE = 'http://apiamis.test/api'
export const PRODUCTION_API_BASE = 'https://apiamis.cianjur.space/api'

export function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

export function isDevApiUrl(url: string) {
  return /apiamis\.test|localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url)
}

export function resolveApiBaseUrl(options: {
  devMode: boolean
  envUrl?: string
  extraUrl?: string
}) {
  if (!options.devMode) {
    return normalizeBaseUrl(PRODUCTION_API_BASE)
  }

  const fromEnv = options.envUrl?.trim()
  const fromExtra = options.extraUrl?.trim()

  if (fromEnv && !isDevApiUrl(fromEnv)) {
    return normalizeBaseUrl(fromEnv)
  }

  if (fromExtra && !isDevApiUrl(fromExtra)) {
    return normalizeBaseUrl(fromExtra)
  }

  return normalizeBaseUrl(DEVELOPMENT_API_BASE)
}

export function formatNetworkFailureMessage(error: unknown, apiBase: string, action = 'Terhubung ke server') {
  if (error instanceof TypeError) {
    return `${action} gagal (${apiBase}). Periksa koneksi internet lalu coba lagi.`
  }

  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return `${action} gagal (${apiBase}). Periksa koneksi internet lalu coba lagi.`
  }

  return null
}