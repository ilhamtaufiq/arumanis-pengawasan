import { AppState, type AppStateStatus, Platform } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
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
let applyInFlight = false

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Terapkan OTA dengan splash native supaya tidak blank putih setelah reloadAsync.
 * Expo reload sering "menggantung" UI jika splash sudah di-hide sebelumnya.
 */
async function applyOtaUpdateWithAnimation() {
  if (applyInFlight) return
  applyInFlight = true
  setOtaUpdatePhase('applying')

  try {
    // Pastikan splash tampil lagi sebelum bundle diganti.
    await SplashScreen.preventAutoHideAsync().catch(() => undefined)
    await delay(OTA_APPLY_ANIMATION_MS)

    // reloadAsync biasanya tidak resolve (JS context diganti). Jika resolve/gagal, tangani.
    await Updates.reloadAsync()

    // Jika sampai di sini (jarang), reload tidak terjadi — minta buka ulang manual.
    markOtaReloadPending()
    setOtaUpdatePhase('error')
  } catch {
    // Beberapa device melempar error meski reload sudah dijadwalkan.
    // Tunggu sebentar; jika app masih hidup, tampilkan instruksi buka ulang.
    await delay(1_200)
    markOtaReloadPending()
    setOtaUpdatePhase('error')
    void SplashScreen.hideAsync().catch(() => undefined)
  } finally {
    applyInFlight = false
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
  if (!isOtaReloadPending()) return
  if (shouldDeferOtaReload(appState)) return

  if (!consumeOtaReloadPending()) return
  await applyOtaUpdateWithAnimation()
}

/** Terapkan update yang sudah diunduh — dipanggil dari UI. */
export async function applyOtaUpdateNow() {
  if (!isOtaReloadPending() || applyInFlight) return false

  // Jangan consume dulu — jika gagal, user masih bisa coba lagi.
  // Consume tepat sebelum reload agar background handler tidak double-apply.
  if (!consumeOtaReloadPending()) return false
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
    // Saat kembali active setelah error, biarkan UI error tetap (user bisa tekan buka ulang).
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
    // Jangan reset ke idle di sini saat unmount normal — biarkan phase bertahan
    // hanya reset lifecycle flag.
  }
}

/** @deprecated Pakai startOtaUpdateLifecycle */
export async function checkAndApplyOtaUpdate() {
  const downloaded = await downloadOtaUpdateIfAvailable()
  if (!downloaded || shouldDeferOtaReload(AppState.currentState)) return

  if (!consumeOtaReloadPending()) return
  await applyOtaUpdateWithAnimation()
}
