import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors } from '@/theme/tokens'

type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.accent, fg: colors.foreground },
  info: { bg: colors.info, fg: colors.foreground },
  warning: { bg: colors.main, fg: colors.foreground },
  danger: { bg: colors.danger, fg: '#ffffff' },
  neutral: { bg: colors.muted, fg: colors.foreground },
}

export function NeoBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const palette = toneMap[tone]

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.bg,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: '700' }}>{children}</Text>
    </View>
  )
}