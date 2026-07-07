import '../global.css'
import '@/lib/background-location-task'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FotoUploadQueueProvider } from '@/hooks/useFotoUploadQueue'
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation'
import { LocationGate } from '@/components/LocationGate'
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation'
import { useLocationEnforcement } from '@/hooks/useLocationEnforcement'
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat'
import { AuthProvider, useAuth } from '@/lib/auth'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'
import { checkAndApplyOtaUpdate } from '@/lib/app-updates'
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

void checkAndApplyOtaUpdate()

export const ErrorBoundary = createRouteErrorBoundary('Aplikasi', false)

function AppShell() {
  const { canFetch, isLoading } = useAuth()
  const locationEnforcement = useLocationEnforcement()
  usePresenceHeartbeat()
  useBackgroundLocation()
  useNotificationNavigation()

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [isLoading])

  return (
    <FotoUploadQueueProvider enabled={canFetch && locationEnforcement.ready}>
      <LocationGate
        visible={locationEnforcement.required && !locationEnforcement.ready}
        readiness={locationEnforcement.readiness}
        checking={locationEnforcement.checking}
        onRetry={() => {
          void locationEnforcement.enforce()
        }}
        onOpenSettings={locationEnforcement.openSettings}
      />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
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
    <SafeAreaProvider>
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