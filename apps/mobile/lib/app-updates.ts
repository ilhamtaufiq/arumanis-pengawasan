import { Platform } from 'react-native'
import * as Updates from 'expo-updates'

/**
 * Cek dan terapkan OTA update (EAS Update) saat app dibuka.
 * Hanya aktif di build native release/preview — bukan dev client atau web.
 */
export async function checkAndApplyOtaUpdate() {
  if (__DEV__ || Platform.OS === 'web') return
  if (!Updates.isEnabled) return

  try {
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) return

    await Updates.fetchUpdateAsync()
    await Updates.reloadAsync()
  } catch {
    // Offline atau update belum tersedia — lanjutkan dengan bundle saat ini.
  }
}