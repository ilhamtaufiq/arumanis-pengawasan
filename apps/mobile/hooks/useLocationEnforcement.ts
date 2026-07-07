import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAuth } from '@/lib/auth'
import {
  assessLocationReadiness,
  enforceLocationAccess,
  openLocationSettings,
  type LocationReadiness,
} from '@/lib/location-enforcement'

export function useLocationEnforcement() {
  const { canFetch } = useAuth()
  const [readiness, setReadiness] = useState<LocationReadiness | null>(null)
  const [checking, setChecking] = useState(false)
  const appState = useRef<AppStateStatus>(AppState.currentState)

  const refresh = useCallback(async () => {
    const next = await assessLocationReadiness()
    setReadiness(next)
    return next
  }, [])

  const enforce = useCallback(async () => {
    setChecking(true)
    try {
      const next = await enforceLocationAccess()
      setReadiness(next)
      return next
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (!canFetch) {
      setReadiness(null)
      return
    }

    void enforce()
  }, [canFetch, enforce])

  useEffect(() => {
    if (!canFetch) return

    const handleAppState = (next: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/)
      appState.current = next

      if (wasBackground && next === 'active') {
        void enforce()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => subscription.remove()
  }, [canFetch, enforce])

  return {
    required: canFetch,
    ready: readiness?.ready ?? !canFetch,
    readiness,
    checking,
    enforce,
    refresh,
    openSettings: () => {
      void openLocationSettings()
    },
  }
}