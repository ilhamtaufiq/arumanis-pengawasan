import Constants from 'expo-constants'
import { getApiBaseUrl } from './config'

const extra = Constants.expoConfig?.extra as
  | {
      reverbAppKey?: string
      reverbHost?: string
      reverbPort?: number
      reverbScheme?: string
    }
  | undefined

function readEnv(name: string) {
  const value = process.env[name]
  return value?.trim() || ''
}

function isDevHost(host: string) {
  return /apiamis\.test|localhost|127\.0\.0\.1/i.test(host)
}

export function getReverbAppKey() {
  return readEnv('EXPO_PUBLIC_REVERB_APP_KEY') || extra?.reverbAppKey?.trim() || ''
}

export function getReverbHost() {
  if (!__DEV__) {
    return 'apiamis.cianjur.space'
  }

  const fromEnv = readEnv('EXPO_PUBLIC_REVERB_HOST')
  if (fromEnv && !isDevHost(fromEnv)) {
    return fromEnv
  }

  return extra?.reverbHost?.trim() || 'apiamis.test'
}

export function getReverbPort() {
  if (!__DEV__) {
    return 443
  }

  const fromEnv = readEnv('EXPO_PUBLIC_REVERB_PORT')
  if (fromEnv) return Number(fromEnv)
  if (extra?.reverbPort) return extra.reverbPort
  return getReverbScheme() === 'https' ? 443 : 8080
}

export function getReverbScheme() {
  if (!__DEV__) {
    return 'https'
  }

  const fromEnv = readEnv('EXPO_PUBLIC_REVERB_SCHEME')
  if (fromEnv) {
    return fromEnv
  }

  return extra?.reverbScheme?.trim() || 'http'
}

export function isReverbEnabled() {
  return Boolean(getReverbAppKey())
}

export function getBroadcastingAuthUrl() {
  const apiBase = getApiBaseUrl().replace(/\/$/, '')
  return `${apiBase}/broadcasting/auth`
}