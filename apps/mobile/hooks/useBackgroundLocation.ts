import { useCallback, useEffect, useState } from 'react'
import {
  getBackgroundLocationEnabled,
  setBackgroundLocationEnabled,
} from '@/lib/background-location-prefs'
import {
  isBackgroundLocationPlatformSupported,
  isBackgroundLocationTrackingActive,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '@/lib/background-location'

export function useBackgroundLocation() {
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supported = isBackgroundLocationPlatformSupported()

  const refresh = useCallback(async () => {
    if (!supported) {
      setEnabled(false)
      setActive(false)
      setLoading(false)
      return
    }

    const [prefEnabled, trackingActive] = await Promise.all([
      getBackgroundLocationEnabled(),
      isBackgroundLocationTrackingActive(),
    ])
    setEnabled(prefEnabled)
    setActive(trackingActive)
    setLoading(false)
  }, [supported])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Pelacakan diaktifkan lewat useLocationEnforcement agar tidak bentrok dengan gate izin.

  const enable = useCallback(async () => {
    setError(null)
    setLoading(true)
    const result = await startBackgroundLocationTracking()
    if (!result.ok) {
      setError(result.message ?? 'Gagal mengaktifkan pelacakan GPS.')
      await setBackgroundLocationEnabled(false)
      setEnabled(false)
      setActive(false)
      setLoading(false)
      return false
    }

    setEnabled(true)
    setActive(true)
    setLoading(false)
    return true
  }, [])

  const disable = useCallback(async () => {
    setError(null)
    setLoading(true)
    await stopBackgroundLocationTracking()
    setEnabled(false)
    setActive(false)
    setLoading(false)
  }, [])

  return {
    supported,
    enabled,
    active,
    loading,
    error,
    enable,
    disable,
    refresh,
  }
}