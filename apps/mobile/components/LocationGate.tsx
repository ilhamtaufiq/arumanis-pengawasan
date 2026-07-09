import { Modal, Text, View } from 'react-native'
import { NeoButton, NeoSurface } from '@/components/ui'
import type { LocationReadiness } from '@/lib/location-enforcement'
import { colors } from '@/theme/tokens'

type LocationGateProps = {
  visible: boolean
  readiness: LocationReadiness | null
  checking: boolean
  onRetry: () => void
  onOpenSettings: () => void
}

export function LocationGate({ visible, readiness, checking, onRetry, onOpenSettings }: LocationGateProps) {
  const title =
    readiness?.reason === 'services_disabled'
      ? 'GPS belum aktif'
      : readiness?.reason === 'background_denied'
        ? 'Izin lokasi "Selalu" diperlukan'
        : 'Izin lokasi diperlukan'

  const message =
    readiness?.message ??
    'Aplikasi pengawasan membutuhkan GPS aktif dan izin lokasi untuk mencatat koordinat lapangan.'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.88)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <NeoSurface shadow="lg" style={{ gap: 16, maxWidth: 420, alignSelf: 'center', width: '100%' }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>LOKASI WAJIB</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>{title}</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 21 }}>{message}</Text>
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>
              Tanpa GPS dan izin lokasi, aplikasi tidak dapat digunakan untuk pengawasan lapangan.
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <NeoButton
              label={checking ? 'Memeriksa...' : 'Izinkan lokasi'}
              onPress={onRetry}
              disabled={checking}
            />
            <NeoButton label="Buka pengaturan" variant="neutral" onPress={onOpenSettings} />
          </View>
        </NeoSurface>
      </View>
    </Modal>
  )
}