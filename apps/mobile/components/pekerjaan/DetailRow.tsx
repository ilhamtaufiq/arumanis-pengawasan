import { Text, View } from 'react-native'
import { colors } from '@/theme/tokens'

type DetailRowProps = {
  label: string
  value: string
  /** Baris penuh — untuk teks panjang seperti nama kegiatan/paket */
  fullWidth?: boolean
}

export function DetailRow({ label, value, fullWidth = false }: DetailRowProps) {
  return (
    <View
      style={{
        gap: 4,
        width: fullWidth ? '100%' : undefined,
        flexBasis: fullWidth ? '100%' : '48%',
        flexGrow: fullWidth ? 0 : 1,
        flexShrink: 1,
        minWidth: fullWidth ? 0 : 0,
        maxWidth: fullWidth ? '100%' : '48%',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.mutedForeground,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: colors.foreground,
          lineHeight: 22,
          flexShrink: 1,
        }}
      >
        {value}
      </Text>
    </View>
  )
}