import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'
import { useRouter } from 'expo-router'
import { EmptyState, Spinner } from '@/components/ui'
import { setSessionTokenSync } from '@/lib/api'
import { setSessionToken } from '@/lib/session'
import { parseOAuthCallbackFromLocation } from '@/lib/google-auth'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'

export const ErrorBoundary = createRouteErrorBoundary('OAuth Callback', false)

export default function OAuthCallbackScreen() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/login')
      return
    }

    const { token, error: oauthError } = parseOAuthCallbackFromLocation()

    if (oauthError) {
      setError(oauthError)
      return
    }

    if (!token) {
      setError('Token tidak diterima dari Google')
      return
    }

    void (async () => {
      await setSessionToken(token)
      setSessionTokenSync(token)

      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.location.replace('/')
        return
      }

      router.replace('/(tabs)')
    })()
  }, [router])

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <EmptyState
          title="Login Google gagal"
          description={error}
          actionLabel="Kembali ke login"
          onAction={() => router.replace('/login')}
        />
      </View>
    )
  }

  return <Spinner label="Menyelesaikan login..." />
}