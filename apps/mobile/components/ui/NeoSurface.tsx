import { type ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

type NeoSurfaceProps = ViewProps & {
  children: ReactNode
  tone?: 'card' | 'main' | 'secondary' | 'accent' | 'muted'
  shadow?: 'sm' | 'md' | 'lg' | 'none'
}

const toneMap = {
  card: colors.card,
  main: colors.main,
  secondary: colors.secondary,
  accent: colors.accent,
  muted: colors.muted,
}

export function NeoSurface({ children, tone = 'card', shadow = 'md', style, ...rest }: NeoSurfaceProps) {
  return (
    <View
      style={[
        {
          backgroundColor: toneMap[tone],
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          padding: 16,
        },
        shadow !== 'none' ? shadows[shadow] : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}