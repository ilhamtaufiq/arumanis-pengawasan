import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { NeoButton, NeoInput, NeoSurface, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'

export const ErrorBoundary = createRouteErrorBoundary('Login', false)

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setGoogleSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login Google gagal')
    } finally {
      setGoogleSubmitting(false)
    }
  }

  if (authLoading) {
    return <Spinner label="Memeriksa sesi..." />
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground }}>Dashboard Pengawas</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            Masuk langsung ke API Arumanis (standalone). Gunakan akun pengawas yang sama seperti portal.
          </Text>
        </View>

        <NeoSurface style={{ gap: 16 }}>
          {error ? (
            <View
              style={{
                backgroundColor: colors.secondary,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.foreground }}>{error}</Text>
            </View>
          ) : null}

          <NeoInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@contoh.id"
          />
          <NeoInput
            label="Password"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <NeoButton
            label={submitting ? 'Memproses...' : 'Masuk'}
            onPress={() => void handleSubmit()}
            disabled={submitting || googleSubmitting || !email.trim() || !password}
            fullWidth
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>ATAU</Text>
            <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
          </View>

          <GoogleLoginButton
            onPress={() => void handleGoogleLogin()}
            loading={googleSubmitting}
            disabled={submitting}
          />
        </NeoSurface>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}