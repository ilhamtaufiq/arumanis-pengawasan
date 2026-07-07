import * as Location from 'expo-location'
import { Linking, Platform } from 'react-native'
import {
  isBackgroundLocationPlatformSupported,
  requestBackgroundLocationPermissions,
  startBackgroundLocationTracking,
} from '@/lib/background-location'
import { setBackgroundLocationEnabled } from '@/lib/background-location-prefs'

export type LocationBlockReason =
  | 'unsupported'
  | 'services_disabled'
  | 'foreground_denied'
  | 'background_denied'
  | 'tracking_failed'

export type LocationReadiness = {
  ready: boolean
  reason?: LocationBlockReason
  message?: string
  servicesEnabled: boolean
  foregroundGranted: boolean
  backgroundGranted: boolean
}

function isWeb() {
  return Platform.OS === 'web'
}

export async function assessLocationReadiness(): Promise<LocationReadiness> {
  if (isWeb()) {
    return {
      ready: true,
      servicesEnabled: true,
      foregroundGranted: true,
      backgroundGranted: true,
    }
  }

  if (!isBackgroundLocationPlatformSupported()) {
    return {
      ready: false,
      reason: 'unsupported',
      message: 'Pelacakan GPS hanya tersedia di Android/iOS.',
      servicesEnabled: false,
      foregroundGranted: false,
      backgroundGranted: false,
    }
  }

  const [servicesEnabled, foreground, background] = await Promise.all([
    Location.hasServicesEnabledAsync(),
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ])

  const foregroundGranted = foreground.status === 'granted'
  const backgroundGranted = background.status === 'granted'

  if (!servicesEnabled) {
    return {
      ready: false,
      reason: 'services_disabled',
      message: 'Aktifkan GPS/lokasi di perangkat untuk melanjutkan pengawasan.',
      servicesEnabled,
      foregroundGranted,
      backgroundGranted,
    }
  }

  if (!foregroundGranted) {
    return {
      ready: false,
      reason: 'foreground_denied',
      message: 'Izinkan akses lokasi agar aplikasi dapat mencatat koordinat lapangan.',
      servicesEnabled,
      foregroundGranted,
      backgroundGranted,
    }
  }

  if (!backgroundGranted) {
    return {
      ready: false,
      reason: 'background_denied',
      message: 'Izinkan lokasi "Selalu" agar koordinat tetap terkirim saat aplikasi tidak dibuka.',
      servicesEnabled,
      foregroundGranted,
      backgroundGranted,
    }
  }

  return {
    ready: true,
    servicesEnabled,
    foregroundGranted,
    backgroundGranted,
  }
}

async function ensureDeviceLocationServicesEnabled(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) {
    return true
  }

  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync()
    } catch {
      // User menolak dialog sistem — lanjutkan ke pengaturan manual.
    }
  }

  return Location.hasServicesEnabledAsync()
}

/**
 * Wajibkan GPS aktif + izin lokasi (foreground & background) lalu mulai pelacakan.
 */
export async function enforceLocationAccess(): Promise<LocationReadiness> {
  if (isWeb()) {
    return assessLocationReadiness()
  }

  if (!isBackgroundLocationPlatformSupported()) {
    return assessLocationReadiness()
  }

  const servicesEnabled = await ensureDeviceLocationServicesEnabled()
  if (!servicesEnabled) {
    return assessLocationReadiness()
  }

  const granted = await requestBackgroundLocationPermissions()
  if (!granted) {
    return assessLocationReadiness()
  }

  await setBackgroundLocationEnabled(true)
  const tracking = await startBackgroundLocationTracking()
  if (!tracking.ok) {
    return {
      ready: false,
      reason: 'tracking_failed',
      message: tracking.message ?? 'Gagal mengaktifkan pelacakan GPS.',
      servicesEnabled: true,
      foregroundGranted: true,
      backgroundGranted: true,
    }
  }

  return assessLocationReadiness()
}

export async function openLocationSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
      return
    } catch {
      // Fallback ke pengaturan app.
    }
  }

  await Linking.openSettings()
}