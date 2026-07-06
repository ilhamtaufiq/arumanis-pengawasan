import { Pressable, Text, type PressableProps } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

type Variant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'ghost'

type NeoButtonProps = PressableProps & {
  label: string
  variant?: Variant
  compact?: boolean
}

const variantStyles: Record<Variant, { bg: string; fg: string; border: boolean }> = {
  primary: { bg: colors.main, fg: colors.foreground, border: true },
  secondary: { bg: colors.secondary, fg: colors.foreground, border: true },
  neutral: { bg: colors.card, fg: colors.foreground, border: true },
  danger: { bg: colors.danger, fg: '#ffffff', border: true },
  ghost: { bg: 'transparent', fg: colors.foreground, border: false },
}

export function NeoButton({ label, variant = 'primary', compact, disabled, style, ...rest }: NeoButtonProps) {
  const v = variantStyles[variant]

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const { pressed } = state
        return [
          {
            minHeight: 44,
            paddingHorizontal: compact ? 12 : 16,
            paddingVertical: compact ? 8 : 12,
            backgroundColor: v.bg,
            borderWidth: v.border ? 2 : 0,
            borderColor: colors.border,
            borderRadius: radius,
            opacity: disabled ? 0.6 : 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          variant !== 'ghost' && !pressed ? shadows.sm : null,
          pressed && variant !== 'ghost' ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null,
          typeof style === 'function' ? style(state) : style,
        ]
      }}
      {...rest}
    >
      <Text style={{ color: v.fg, fontWeight: '700', fontSize: compact ? 14 : 16 }}>{label}</Text>
    </Pressable>
  )
}