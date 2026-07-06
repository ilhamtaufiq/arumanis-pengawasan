import * as Location from 'expo-location'
import { Platform } from 'react-native'
import { formatKoordinat } from '@pengawas/shared/koordinat'

export async function getDeviceKoordinat(): Promise<string> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Browser tidak mendukung geolocation.')
    }

    return await new Promise<string>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(formatKoordinat(position.coords.latitude, position.coords.longitude))
        },
        () => {
          reject(new Error('Gagal mendapatkan lokasi dari perangkat.'))
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })
  }

  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    throw new Error('Izin lokasi diperlukan untuk mengisi koordinat GPS.')
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  })

  return formatKoordinat(position.coords.latitude, position.coords.longitude)
}