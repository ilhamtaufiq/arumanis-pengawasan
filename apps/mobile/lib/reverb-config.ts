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

export function getReverbAppKey() {
  return readEnv('EXPO_PUBLIC_REVERB_APP_KEY') || extra?.reverbAppKey?.trim() || ''
}

export function getReverbHost() {
  return readEnv('EXPO_PUBLIC_REVERB_HOST') || extra?.reverbHost?.trim() || 'apiamis.test'
}

export function getReverbPort() {
  const fromEnv = readEnv('EXPO_PUBLIC_REVERB_PORT')
  if (fromEnv) return Number(fromEnv)
  if (extra?.reverbPort) return extra.reverbPort
  return getReverbScheme() === 'https' ? 443 : 8080
}

export function getReverbScheme() {
  return readEnv('EXPO_PUBLIC_REVERB_SCHEME') || extra?.reverbScheme?.trim() || 'http'
}

export function isReverbEnabled() {
  return Boolean(getReverbAppKey())
}

export function getBroadcastingAuthUrl() {
  const apiBase = getApiBaseUrl().replace(/\/$/, '')
  return `${apiBase}/broadcasting/auth`
}