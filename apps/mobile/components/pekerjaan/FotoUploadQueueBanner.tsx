import { Pressable, Text } from 'react-native'
import { useFotoUploadQueue } from '@/hooks/useFotoUploadQueue'
import { NeoSurface } from '@/components/ui'
import { colors } from '@/theme/tokens'

export function FotoUploadQueueBanner() {
  const { pendingCount, isSyncing, flushQueue } = useFotoUploadQueue()

  if (pendingCount === 0) return null

  return (
    <NeoSurface tone="main" style={{ gap: 8, padding: 12 }}>
      <Text style={{ fontWeight: '800', color: colors.foreground, lineHeight: 20 }}>
        {isSyncing
          ? `Mengirim ${pendingCount} foto tertunda...`
          : `${pendingCount} foto menunggu koneksi`}
      </Text>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
        Foto disimpan di perangkat dan akan dikirim otomatis saat online.
      </Text>
      {!isSyncing ? (
        <Pressable onPress={flushQueue} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontWeight: '800', textDecorationLine: 'underline', color: colors.foreground }}>
            Kirim sekarang
          </Text>
        </Pressable>
      ) : null}
    </NeoSurface>
  )
}