import { Pressable, Text, View } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

type NeoChipToggleProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  disabled?: boolean
}

export function NeoChipToggle({ label, checked, onChange, hint, disabled }: NeoChipToggleProps) {
  return (
    <View style={{ gap: 6, width: '100%' }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          alignSelf: 'flex-start',
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: checked ? colors.info : colors.card,
          opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
          ...shadows.sm,
        })}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: 4,
            backgroundColor: checked ? colors.main : colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Text style={{ fontWeight: '800', fontSize: 12 }}>✓</Text> : null}
        </View>
        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.foreground }}>{label}</Text>
      </Pressable>
      {hint ? (
        <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>{hint}</Text>
      ) : null}
    </View>
  )
}