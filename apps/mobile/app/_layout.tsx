import '../global.css'
import '@/lib/background-location-task'
import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'
import { FotoUploadQueueProvider } from '@/hooks/useFotoUploadQueue'
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation'
import { LocationGate } from '@/components/LocationGate'
import { OtaUpdateBanner } from '@/components/OtaUpdateBanner'
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation'
import { useLocationEnforcement } from '@/hooks/useLocationEnforcement'
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat'
import { AuthProvider, useAuth } from '@/lib/auth'
import { installGlobalClientErrorReporting } from '@/lib/client-error-reporting'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'
import { startOtaUpdateLifecycle } from '@/lib/app-updates'
import { resetOtaUpdatePhase } from '@/lib/ota-update-status'
import { queryClient } from '@/lib/query-client'
import {
  asyncStoragePersister,
  QUERY_PERSIST_BUSTER,
  QUERY_PERSIST_MAX_AGE_MS,
  shouldPersistQueryKey,
} from '@/lib/query-persist'
import { colors } from '@/theme/tokens'

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Web atau lingkungan tanpa native splash — abaikan.
})

// Global JS fatal / uncaught → POST /client-error-reports → error-logs di web
installGlobalClientErrorReporting()

export const ErrorBoundary = createRouteErrorBoundary('Aplikasi', false)

function AppShell() {
  const { canFetch, isLoading } = useAuth()
  const locationEnforcement = useLocationEnforcement()
  const splashHiddenRef = useRef(false)
  usePresenceHeartbeat()
  useBackgroundLocation()
  useNotificationNavigation()

  useEffect(() => {
    // Setelah cold start / OTA reload, pastikan phase bersih (kecuali error yang
    // di-set di sesi yang sama sebelum unmount — di cold start selalu idle).
    resetOtaUpdatePhase()
  }, [])

  useEffect(() => {
    if (splashHiddenRef.current) return

    if (!isLoading) {
      // Sedikit delay agar root tree sempat mount — hindari blank setelah OTA reload.
      const t = setTimeout(() => {
        if (splashHiddenRef.current) return
        splashHiddenRef.current = true
        void SplashScreen.hideAsync().catch(() => undefined)
      }, 120)
      return () => clearTimeout(t)
    }

    const fallback = setTimeout(() => {
      if (splashHiddenRef.current) return
      splashHiddenRef.current = true
      void SplashScreen.hideAsync().catch(() => undefined)
    }, 4000)

    return () => clearTimeout(fallback)
  }, [isLoading])

  useEffect(() => {
    if (isLoading) return undefined
    return startOtaUpdateLifecycle()
  }, [isLoading])

  return (
    <FotoUploadQueueProvider enabled={canFetch && locationEnforcement.ready}>
      <OtaUpdateBanner />
      <LocationGate
        visible={
          locationEnforcement.required &&
          !locationEnforcement.ready &&
          !locationEnforcement.suppressGate
        }
        readiness={locationEnforcement.readiness}
        checking={locationEnforcement.checking}
        onRetry={() => {
          void locationEnforcement.enforce()
        }}
        onOpenSettings={locationEnforcement.openSettings}
      />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="oauth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="pekerjaan" options={{ headerShown: false }} />
        <Stack.Screen name="notifikasi" options={{ headerShown: false }} />
      </Stack>
    </FotoUploadQueueProvider>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" backgroundColor={colors.background} translucent={false} />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: QUERY_PERSIST_MAX_AGE_MS,
          buster: QUERY_PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === 'success' && shouldPersistQueryKey(query.queryKey),
          },
        }}
      >
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}