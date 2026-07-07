import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const PREFS_KEY = 'pengawas_background_location_enabled'

let memoryEnabled: boolean | null = null

function isWeb() {
  return Platform.OS === 'web'
}

async function readEnabled(): Promise<boolean> {
  if (isWeb()) {
    return false
  }

  try {
    const value = await SecureStore.getItemAsync(PREFS_KEY)
    // Default aktif — GPS wajib untuk app pengawasan lapangan.
    if (value == null) {
      return true
    }
    return value === '1'
  } catch {
    return true
  }
}

export async function getBackgroundLocationEnabled(): Promise<boolean> {
  if (memoryEnabled != null) {
    return memoryEnabled
  }

  memoryEnabled = await readEnabled()
  return memoryEnabled
}

export async function setBackgroundLocationEnabled(enabled: boolean): Promise<void> {
  memoryEnabled = enabled

  if (isWeb()) {
    return
  }

  if (enabled) {
    await SecureStore.setItemAsync(PREFS_KEY, '1')
    return
  }

  await SecureStore.deleteItemAsync(PREFS_KEY)
}