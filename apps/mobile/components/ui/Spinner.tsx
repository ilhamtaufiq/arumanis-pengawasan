import { ActivityIndicator, Text, View } from 'react-native'
import { colors } from '@/theme/tokens'

export function Spinner({ label = 'Memuat...' }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 }}>
      <ActivityIndicator size="large" color={colors.foreground} />
      <Text style={{ fontWeight: '700', color: colors.foreground }}>{label}</Text>
    </View>
  )
}