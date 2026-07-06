import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors } from '@/theme/tokens'

type ScreenErrorFallbackProps = {
  error: Error
  onRetry: () => void
  scope?: string
  showHomeAction?: boolean
}

export function ScreenErrorFallback({
  error,
  onRetry,
  scope = 'Layar',
  showHomeAction = true,
}: ScreenErrorFallbackProps) {
  const message = error.message?.trim() || 'Terjadi kesalahan tak terduga.'

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <NeoSurface tone="secondary" style={{ gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, lineHeight: 28 }}>
          {scope} bermasalah
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>
          Muat ulang layar ini. Jika masalah berulang, kembali ke beranda lalu buka lagi.
        </Text>
        <Text
          selectable
          style={{
            fontSize: 13,
            color: colors.foreground,
            lineHeight: 18,
            fontFamily: 'monospace',
          }}
        >
          {message}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <NeoButton label="Coba lagi" variant="primary" onPress={onRetry} />
          {showHomeAction ? (
            <NeoButton
              label="Ke beranda"
              variant="neutral"
              onPress={() => router.replace('/(tabs)')}
            />
          ) : null}
        </View>
      </NeoSurface>
    </View>
  )
}