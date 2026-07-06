import { View } from 'react-native'
import { colors } from '@/theme/tokens'

export function DetailProgressFill({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(percent, 100))

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${clamped}%`,
        backgroundColor: colors.accent,
      }}
    />
  )
}