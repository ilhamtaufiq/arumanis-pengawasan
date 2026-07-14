import { useMemo, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { useAuth } from '@/lib/auth'
import { formatAppBuildSummary, getAppBuildInfo } from '@/lib/app-build-info'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { NeoButton, NeoInput, NeoSurface, Spinner } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'

export const ErrorBoundary = createRouteErrorBoundary('Login', false)

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login, loginWithGoogle, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [copiedHint, setCopiedHint] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const buildInfo = useMemo(() => getAppBuildInfo(), [])
  const buildSummary = useMemo(() => formatAppBuildSummary(buildInfo), [buildInfo])

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Periksa email dan kata sandi.')
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
      setError(err instanceof Error ? err.message : 'Login Google gagal. Coba lagi.')
    } finally {
      setGoogleSubmitting(false)
    }
  }

  if (authLoading) {
    return <Spinner label="Menyiapkan aplikasi…" />
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
          paddingHorizontal: 20,
          gap: 16,
        }}
      >
        {/* Hero neobrutalism */}
        <View
          style={{
            borderWidth: 3,
            borderColor: colors.border,
            borderRadius: radius,
            backgroundColor: colors.main,
            padding: 18,
            gap: 12,
            ...shadows.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderWidth: 3,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                source={require('../assets/arumanis.png')}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1,
                  color: colors.foreground,
                  textTransform: 'uppercase',
                }}
              >
                Arumanis
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.foreground, lineHeight: 28 }}>
                Masuk Pengawas
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, lineHeight: 20 }}>
            Pantau pekerjaan lapangan, unggah foto, dan laporkan progres dari ponsel Anda.
          </Text>
        </View>

        <NeoSurface style={{ gap: 16 }} shadow="md">
          {error ? (
            <View
              style={{
                backgroundColor: '#fef2f2',
                borderWidth: 2,
                borderColor: '#dc2626',
                borderRadius: radius,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#7f1d1d', lineHeight: 20 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground }}>
              Cara tercepat
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
              Gunakan akun Google dinas yang sudah terdaftar sebagai pengawas.
            </Text>
          </View>

          <GoogleLoginButton
            onPress={() => void handleGoogleLogin()}
            loading={googleSubmitting}
            disabled={submitting}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.mutedForeground }}>
              ATAU EMAIL
            </Text>
            <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
          </View>

          <NeoInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@contoh.id"
          />
          <NeoInput
            label="Kata sandi"
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <NeoButton
            label={submitting ? 'Memproses…' : 'Masuk'}
            onPress={() => void handleSubmit()}
            disabled={submitting || googleSubmitting || !email.trim() || !password}
            fullWidth
          />
        </NeoSurface>

        <Pressable onPress={() => setShowAdvanced((v) => !v)} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
            {showAdvanced ? 'Sembunyikan info versi' : 'Info versi aplikasi'}
          </Text>
        </Pressable>

        {showAdvanced ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Salin info versi"
            onPress={() => {
              const lines = [
                `Versi ${buildInfo.appVersion} (build ${buildInfo.nativeBuild})`,
                `Saluran ${buildInfo.channel}`,
                `Runtime ${buildInfo.runtimeVersion}`,
                `Sumber ${buildInfo.sourceLabel}`,
                `Pembaruan ${buildInfo.updateId}`,
                buildInfo.updateCreatedAt ? `Waktu ${buildInfo.updateCreatedAt}` : null,
                `Platform ${buildInfo.platform}`,
              ]
                .filter(Boolean)
                .join('\n')
              void Clipboard.setStringAsync(lines).then(() => {
                setCopiedHint(true)
                setTimeout(() => setCopiedHint(false), 1500)
              })
            }}
            style={{
              padding: 12,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.card,
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: colors.mutedForeground,
                textTransform: 'uppercase',
              }}
            >
              Versi {copiedHint ? '· disalin' : '· ketuk untuk salin'}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.foreground,
                fontVariant: ['tabular-nums'],
              }}
            >
              {buildSummary}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
