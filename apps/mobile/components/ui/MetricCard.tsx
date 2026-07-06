import { Text, useWindowDimensions } from 'react-native'
import { NeoSurface } from './NeoSurface'
import { colors } from '@/theme/tokens'

export function MetricCard({
  label,
  value,
  hint,
  tone = 'card',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'card' | 'main' | 'secondary' | 'accent'
}) {
  const { width } = useWindowDimensions()
  const minCardWidth = width < 400 ? '46%' : 140

  return (
    <NeoSurface tone={tone} style={{ flex: 1, minWidth: minCardWidth, gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ fontSize: width < 400 ? 22 : 28, fontWeight: '800', color: colors.foreground }}
      >
        {value}
      </Text>
      {hint ? <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{hint}</Text> : null}
    </NeoSurface>
  )
}