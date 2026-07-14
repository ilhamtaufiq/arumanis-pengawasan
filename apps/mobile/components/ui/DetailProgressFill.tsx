import { View } from 'react-native'
import { colors } from '@/theme/tokens'

export function DetailProgressFill({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(Number(percent) || 0, 100))

  // Hindari width: 'N%' + position absolute (kadang crash/layout aneh di Android low-end).
  return (
    <View style={{ flex: 1, flexDirection: 'row', height: '100%' }}>
      <View style={{ flex: clamped, backgroundColor: colors.accent }} />
      <View style={{ flex: Math.max(0.0001, 100 - clamped), backgroundColor: 'transparent' }} />
    </View>
  )
}