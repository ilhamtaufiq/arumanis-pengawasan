import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

export type AppBuildInfo = {
  /** Versi native app (app.json version / store version). */
  appVersion: string
  /** Build number native (Android versionCode / iOS buildNumber). */
  nativeBuild: string
  /** Channel OTA (preview/production) jika ada. */
  channel: string
  /** Runtime version untuk kompatibilitas OTA. */
  runtimeVersion: string
  /** ID update OTA yang sedang jalan — berubah tiap publish EAS Update. */
  updateId: string
  /** ID pendek untuk ditampilkan di UI. */
  updateIdShort: string
  /** Waktu bundle OTA dibuat (ISO) jika tersedia. */
  updateCreatedAt: string | null
  /** Label ringkas: embedded | ota | dev. */
  sourceLabel: string
  isEmbeddedLaunch: boolean
  isDev: boolean
  platform: string
}

function shortId(value: string | null | undefined, len = 8): string {
  if (!value) return '-'
  const cleaned = value.replace(/-/g, '')
  return cleaned.slice(0, len) || value.slice(0, len)
}

function formatUpdateDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    // Lokal ringkas: 2026-07-10 14:30
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  } catch {
    return null
  }
}

/**
 * Info build/OTA yang stabil untuk ditampilkan di login (verifikasi update terpasang).
 */
export function getAppBuildInfo(): AppBuildInfo {
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeApplicationVersion ??
    '0.0.0'

  const nativeBuild =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.expoConfig?.ios?.buildNumber ??
    '-'

  const channel =
    Updates.channel ||
    (Constants.expoConfig?.updates?.requestHeaders as Record<string, string> | undefined)?.[
      'expo-channel-name'
    ] ||
    'unknown'

  const runtimeVersion =
    (typeof Updates.runtimeVersion === 'string' && Updates.runtimeVersion) ||
    (typeof Constants.expoConfig?.runtimeVersion === 'string'
      ? Constants.expoConfig.runtimeVersion
      : appVersion)

  const updateId = Updates.updateId ?? ''
  const isEmbeddedLaunch = Updates.isEmbeddedLaunch ?? true
  const isDev = Boolean(__DEV__)

  let sourceLabel = 'embedded'
  if (isDev) sourceLabel = 'dev'
  else if (!isEmbeddedLaunch && updateId) sourceLabel = 'ota'

  return {
    appVersion,
    nativeBuild: String(nativeBuild),
    channel: String(channel),
    runtimeVersion: String(runtimeVersion),
    updateId: updateId || '-',
    updateIdShort: shortId(updateId || null),
    updateCreatedAt: formatUpdateDate(Updates.createdAt ?? null),
    sourceLabel,
    isEmbeddedLaunch,
    isDev,
    platform: Platform.OS,
  }
}

/** Satu baris ringkas untuk log/UI. */
export function formatAppBuildSummary(info: AppBuildInfo = getAppBuildInfo()): string {
  const parts = [
    `v${info.appVersion}`,
    `b${info.nativeBuild}`,
    info.channel,
    info.sourceLabel,
    info.updateIdShort !== '-' ? `ota:${info.updateIdShort}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
