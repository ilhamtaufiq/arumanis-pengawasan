import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, InteractionManager, type AppStateStatus } from 'react-native'
import { useAuth } from '@/lib/auth'
import {
  assessLocationReadiness,
  enforceLocationAccess,
  openLocationSettings,
  reconcileLocationAccess,
  type LocationReadiness,
} from '@/lib/location-enforcement'

const ENFORCE_TIMEOUT_MS = 90_000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function useLocationEnforcement() {
  const { canFetch, user } = useAuth()
  // Admin/manager sering di meja — GPS background wajib hanya untuk pengawas lapangan.
  const elevated =
    Boolean(user?.roles?.some((r) => {
      const name = (typeof r === 'string' ? r : r?.name || '').toLowerCase()
      return name === 'admin' || name === 'manager' || name === 'super-admin'
    }))
  const locationRequired = canFetch && !elevated

  const [readiness, setReadiness] = useState<LocationReadiness | null>(null)
  const [checking, setChecking] = useState(false)
  const [awaitingFirstCheck, setAwaitingFirstCheck] = useState(false)
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const enforceInFlight = useRef<Promise<LocationReadiness> | null>(null)

  const refresh = useCallback(async () => {
    const next = await assessLocationReadiness()
    setReadiness(next)
    return next
  }, [])

  const reconcile = useCallback(async () => {
    const next = await reconcileLocationAccess()
    setReadiness(next)
    return next
  }, [])

  const enforce = useCallback(async () => {
    if (enforceInFlight.current) {
      return enforceInFlight.current
    }

    setChecking(true)
    const task = (async () => {
      try {
        const next = await withTimeout(
          enforceLocationAccess(),
          ENFORCE_TIMEOUT_MS,
          'Pemeriksaan lokasi terlalu lama. Coba lagi atau buka pengaturan.',
        )
        setReadiness(next)
        return next
      } catch (error) {
        const assessed = await assessLocationReadiness()
        const message =
          error instanceof Error ? error.message : 'Gagal memeriksa izin lokasi. Coba lagi.'
        const next: LocationReadiness = {
          ...assessed,
          ready: false,
          reason: 'tracking_failed',
          message,
        }
        setReadiness(next)
        return next
      } finally {
        setChecking(false)
        enforceInFlight.current = null
      }
    })()

    enforceInFlight.current = task
    return task
  }, [])

  useEffect(() => {
    if (!locationRequired) {
      setReadiness({
        ready: true,
        servicesEnabled: true,
        foregroundGranted: true,
        backgroundGranted: true,
      })
      setAwaitingFirstCheck(false)
      return
    }

    setAwaitingFirstCheck(true)
    void enforce().finally(() => {
      setAwaitingFirstCheck(false)
    })
  }, [locationRequired, enforce])

  useEffect(() => {
    if (!locationRequired) return

    let reconcileTimer: ReturnType<typeof setTimeout> | null = null
    let interactionHandle: { cancel?: () => void } | null = null

    const scheduleReconcile = () => {
      if (reconcileTimer) clearTimeout(reconcileTimer)
      interactionHandle?.cancel?.()
      reconcileTimer = setTimeout(() => {
        reconcileTimer = null
        interactionHandle = InteractionManager.runAfterInteractions(() => {
          void reconcile()
        })
      }, 2_000)
    }

    const handleAppState = (next: AppStateStatus) => {
      const previous = appState.current
      const wasAway = previous.match(/inactive|background/)
      appState.current = next

      if (next === 'active' && wasAway) {
        scheduleReconcile()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => {
      if (reconcileTimer) clearTimeout(reconcileTimer)
      interactionHandle?.cancel?.()
      subscription.remove()
    }
  }, [locationRequired, reconcile])

  // Sembunyikan gate saat prompt sistem berjalan; jangan toggle saat app sebentar inactive di Android.
  const suppressGate = checking || awaitingFirstCheck || elevated

  return {
    required: locationRequired,
    ready: elevated ? true : readiness?.ready ?? !canFetch,
    readiness,
    checking,
    suppressGate,
    enforce,
    refresh,
    openSettings: () => {
      void openLocationSettings()
    },
  }
}