import * as Location from 'expo-location'
import { Platform } from 'react-native'
import { BACKGROUND_LOCATION_TASK } from '@/lib/background-location-task'
import { getBackgroundLocationEnabled, setBackgroundLocationEnabled } from '@/lib/background-location-prefs'

export function isBackgroundLocationPlatformSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

export async function requestBackgroundLocationPermissions(): Promise<boolean> {
  if (!isBackgroundLocationPlatformSupported()) {
    return false
  }

  const foreground = await Location.requestForegroundPermissionsAsync()
  if (foreground.status !== 'granted') {
    return false
  }

  const background = await Location.requestBackgroundPermissionsAsync()
  return background.status === 'granted'
}

export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  if (!isBackgroundLocationPlatformSupported()) {
    return false
  }

  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  } catch {
    return false
  }
}

const START_TRACKING_TIMEOUT_MS = 15_000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function hasBackgroundLocationPermissions(): Promise<boolean> {
  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ])

  return foreground.status === 'granted' && background.status === 'granted'
}

type StartBackgroundLocationOptions = {
  /** Lewati dialog izin; hanya mulai pelacakan bila izin sudah diberikan. */
  skipPermissionRequest?: boolean
}

export async function startBackgroundLocationTracking(
  options?: StartBackgroundLocationOptions,
): Promise<{ ok: boolean; message?: string }> {
  if (!isBackgroundLocationPlatformSupported()) {
    return { ok: false, message: 'Pelacakan GPS latar belakang hanya tersedia di Android/iOS.' }
  }

  if (options?.skipPermissionRequest) {
    const permitted = await hasBackgroundLocationPermissions()
    if (!permitted) {
      return {
        ok: false,
        message: 'Izin lokasi belum diberikan.',
      }
    }
  } else {
    const granted = await requestBackgroundLocationPermissions()
    if (!granted) {
      return {
        ok: false,
        message: 'Izin lokasi "Selalu" diperlukan agar koordinat tetap terkirim saat aplikasi tidak dibuka.',
      }
    }
  }

  const alreadyActive = await isBackgroundLocationTrackingActive()
  if (!alreadyActive) {
    try {
      await withTimeout(
        Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60_000,
          distanceInterval: 75,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Arumanis Pengawasan',
            notificationBody: 'Mengirim koordinat GPS untuk pengawasan lapangan.',
            notificationColor: '#ffcc00',
          },
        }),
        START_TRACKING_TIMEOUT_MS,
      )
    } catch {
      return {
        ok: false,
        message: 'Gagal memulai pelacakan GPS. Periksa izin lokasi "Selalu" di pengaturan.',
      }
    }
  }

  await setBackgroundLocationEnabled(true)
  return { ok: true }
}

export async function pauseBackgroundLocationTracking(): Promise<void> {
  if (!isBackgroundLocationPlatformSupported()) {
    return
  }

  const active = await isBackgroundLocationTrackingActive()
  if (active) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  await pauseBackgroundLocationTracking()
  await setBackgroundLocationEnabled(false)
}

export async function syncBackgroundLocationTracking(): Promise<void> {
  if (!isBackgroundLocationPlatformSupported()) {
    return
  }

  const enabled = await getBackgroundLocationEnabled()
  const active = await isBackgroundLocationTrackingActive()

  if (enabled && !active) {
    const result = await startBackgroundLocationTracking()
    if (!result.ok) {
      await setBackgroundLocationEnabled(false)
    }
    return
  }

  if (!enabled && active) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  }
}