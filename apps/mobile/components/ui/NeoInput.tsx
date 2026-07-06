import { forwardRef } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

type NeoInputProps = TextInputProps & {
  label?: string
  error?: string
}

export const NeoInput = forwardRef<TextInput, NeoInputProps>(function NeoInput(
  { label, error, style, ...rest },
  ref,
) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontWeight: '700', fontSize: 14, color: colors.foreground }}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        style={[
          {
            minHeight: 44,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius,
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: colors.foreground,
          },
          shadows.sm,
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  )
})