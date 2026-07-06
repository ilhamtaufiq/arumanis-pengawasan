import { useMemo, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { formatDebugError } from '@/lib/format-debug-error'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors } from '@/theme/tokens'

type DebugErrorPanelProps = {
  error: unknown
  scope?: string
  extra?: Record<string, string | number | boolean | null | undefined>
  onRetry?: () => void
  showHomeAction?: boolean
}

export function DebugErrorPanel({
  error,
  scope = 'Layar',
  extra,
  onRetry,
  showHomeAction = true,
}: DebugErrorPanelProps) {
  const [copied, setCopied] = useState(false)
  const report = useMemo(() => formatDebugError({ error, scope, extra }), [error, scope, extra])
  const message = error instanceof Error ? error.message : String(error)

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(report)
      setCopied(true)
      Alert.alert('Disalin', 'Detail error sudah disalin ke clipboard.')
    } catch {
      Alert.alert('Gagal menyalin', 'Salin manual dari kotak teks di bawah.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 }}>
      <NeoSurface tone="secondary" style={{ gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{scope} bermasalah</Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
          Salin laporan debug di bawah lalu kirim ke developer.
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }} numberOfLines={3}>
          {message?.trim() || 'Terjadi kesalahan tak terduga.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <NeoButton label={copied ? 'Sudah disalin' : 'Salin error'} variant="primary" onPress={() => void handleCopy()} />
          {onRetry ? <NeoButton label="Coba lagi" variant="neutral" onPress={onRetry} /> : null}
          {showHomeAction ? (
            <NeoButton label="Ke beranda" variant="ghost" onPress={() => router.replace('/(tabs)')} />
          ) : null}
        </View>
      </NeoSurface>

      <NeoSurface style={{ flex: 1, minHeight: 200, gap: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase' }}>
          Debug report
        </Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text
            selectable
            style={{
              fontSize: 11,
              lineHeight: 16,
              color: colors.foreground,
              fontFamily: 'monospace',
            }}
          >
            {report}
          </Text>
        </ScrollView>
      </NeoSurface>
    </View>
  )
}