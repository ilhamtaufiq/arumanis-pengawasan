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

export async function startBackgroundLocationTracking(): Promise<{ ok: boolean; message?: string }> {
  if (!isBackgroundLocationPlatformSupported()) {
    return { ok: false, message: 'Pelacakan GPS latar belakang hanya tersedia di Android/iOS.' }
  }

  const granted = await requestBackgroundLocationPermissions()
  if (!granted) {
    return {
      ok: false,
      message: 'Izin lokasi "Selalu" diperlukan agar koordinat tetap terkirim saat aplikasi tidak dibuka.',
    }
  }

  const alreadyActive = await isBackgroundLocationTrackingActive()
  if (!alreadyActive) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
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
    })
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