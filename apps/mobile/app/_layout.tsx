import '../global.css'
import '@/lib/background-location-task'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FotoUploadQueueProvider } from '@/hooks/useFotoUploadQueue'
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation'
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation'
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat'
import { AuthProvider, useAuth } from '@/lib/auth'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'
import { queryClient } from '@/lib/query-client'
import { colors } from '@/theme/tokens'

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Web atau lingkungan tanpa native splash — abaikan.
})

export const ErrorBoundary = createRouteErrorBoundary('Aplikasi', false)

function AppShell() {
  const { canFetch, isLoading } = useAuth()
  usePresenceHeartbeat()
  useBackgroundLocation()
  useNotificationNavigation()

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [isLoading])

  return (
    <FotoUploadQueueProvider enabled={canFetch}>
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}