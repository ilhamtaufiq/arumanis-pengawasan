import { useState } from 'react'
import {
  Pressable,
  Text,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

type Variant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'ghost'

type NeoButtonProps = PressableProps & {
  label: string
  variant?: Variant
  compact?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, { bg: string; fg: string; border: boolean }> = {
  primary: { bg: colors.main, fg: colors.foreground, border: true },
  secondary: { bg: colors.secondary, fg: colors.foreground, border: true },
  neutral: { bg: colors.card, fg: colors.foreground, border: true },
  danger: { bg: colors.danger, fg: '#ffffff', border: true },
  ghost: { bg: 'transparent', fg: colors.foreground, border: false },
}

function resolveStyle(style: PressableProps['style'], state: PressableStateCallbackType): StyleProp<ViewStyle> {
  if (typeof style === 'function') {
    return style(state)
  }
  return style
}

export function NeoButton({
  label,
  variant = 'primary',
  compact,
  fullWidth = false,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: NeoButtonProps) {
  const [pressed, setPressed] = useState(false)
  const v = variantStyles[variant]

  const baseStyle: ViewStyle = {
    minHeight: 44,
    width: fullWidth ? '100%' : undefined,
    alignSelf: fullWidth ? 'stretch' : undefined,
    paddingHorizontal: compact ? 12 : 16,
    paddingVertical: compact ? 8 : 12,
    backgroundColor: disabled && variant !== 'ghost' ? colors.muted : v.bg,
    borderWidth: v.border ? 2 : 0,
    borderColor: colors.border,
    borderRadius: radius,
    opacity: disabled ? 0.85 : 1,
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        onPressOut?.(event)
      }}
      style={[
        baseStyle,
        variant !== 'ghost' && !pressed && !disabled ? shadows.sm : null,
        pressed && variant !== 'ghost' && !disabled
          ? { transform: [{ translateX: 2 }, { translateY: 2 }] }
          : null,
        resolveStyle(style, { pressed, hovered: false }),
      ]}
      {...rest}
    >
      <Text style={{ color: v.fg, fontWeight: '700', fontSize: compact ? 14 : 16 }}>{label}</Text>
    </Pressable>
  )
}