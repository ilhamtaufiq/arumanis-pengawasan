import { AppState, type AppStateStatus, Platform } from 'react-native'
import * as Updates from 'expo-updates'
import {
  OTA_CHECK_DELAY_MS,
  consumeOtaReloadPending,
  isOtaReloadPending,
  markOtaReloadPending,
  shouldDeferOtaReload,
} from '@/lib/ota-reload-policy'
import {
  OTA_APPLY_ANIMATION_MS,
  setOtaUpdatePhase,
} from '@/lib/ota-update-status'

export {
  OTA_CHECK_DELAY_MS,
  consumeOtaReloadPending,
  isOtaReloadPending,
  markOtaReloadPending,
  shouldDeferOtaReload,
} from '@/lib/ota-reload-policy'

export {
  OTA_APPLY_ANIMATION_MS,
  getOtaUpdatePhase,
  setOtaUpdatePhase,
  subscribeOtaUpdatePhase,
  type OtaUpdatePhase,
} from '@/lib/ota-update-status'

let otaLifecycleStarted = false

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function applyOtaUpdateWithAnimation() {
  setOtaUpdatePhase('applying')
  await delay(OTA_APPLY_ANIMATION_MS)

  try {
    await Updates.reloadAsync()
  } catch {
    markOtaReloadPending()
    setOtaUpdatePhase('ready')
  }
}

/**
 * Unduh OTA update tanpa reload saat pengguna sedang memakai aplikasi.
 * Reload ditunda sampai app masuk background agar tidak terasa seperti force close.
 */
export async function downloadOtaUpdateIfAvailable() {
  if (__DEV__ || Platform.OS === 'web') return false
  if (!Updates.isEnabled) return false

  try {
    setOtaUpdatePhase('checking')
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) {
      setOtaUpdatePhase('idle')
      return false
    }

    setOtaUpdatePhase('downloading')
    const fetched = await Updates.fetchUpdateAsync()
    if (!fetched.isNew) {
      setOtaUpdatePhase('idle')
      return false
    }

    markOtaReloadPending()
    setOtaUpdatePhase('ready')
    return true
  } catch {
    setOtaUpdatePhase('idle')
    return false
  }
}

async function applyPendingOtaReloadIfNeeded(appState: AppStateStatus) {
  if (!consumeOtaReloadPending()) return
  if (shouldDeferOtaReload(appState)) {
    markOtaReloadPending()
    return
  }

  await applyOtaUpdateWithAnimation()
}

/** Terapkan update yang sudah diunduh — dipanggil dari UI. */
export async function applyOtaUpdateNow() {
  if (!isOtaReloadPending()) return false

  consumeOtaReloadPending()
  await applyOtaUpdateWithAnimation()
  return true
}

/**
 * Mulai siklus OTA: cek setelah UI stabil, unduh diam-diam, terapkan saat app ke background.
 */
export function startOtaUpdateLifecycle(delayMs = OTA_CHECK_DELAY_MS) {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled || otaLifecycleStarted) {
    return () => undefined
  }

  otaLifecycleStarted = true

  const handleAppState = (next: AppStateStatus) => {
    void applyPendingOtaReloadIfNeeded(next)
  }

  const subscription = AppState.addEventListener('change', handleAppState)

  const timer = setTimeout(() => {
    void downloadOtaUpdateIfAvailable().then((downloaded) => {
      if (!downloaded) return
      void applyPendingOtaReloadIfNeeded(AppState.currentState)
    })
  }, delayMs)

  return () => {
    clearTimeout(timer)
    subscription.remove()
    otaLifecycleStarted = false
    setOtaUpdatePhase('idle')
  }
}

/** @deprecated Pakai startOtaUpdateLifecycle — reload langsung menyebabkan force close di Android. */
export async function checkAndApplyOtaUpdate() {
  const downloaded = await downloadOtaUpdateIfAvailable()
  if (!downloaded || shouldDeferOtaReload(AppState.currentState)) return

  consumeOtaReloadPending()
  await applyOtaUpdateWithAnimation()
}