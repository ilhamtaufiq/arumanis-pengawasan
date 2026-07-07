import { Picker } from '@react-native-picker/picker'
import { Platform, Text, View } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

export type NeoSelectOption = {
  value: string
  label: string
}

type NeoSelectProps = {
  label?: string
  value: string
  onValueChange: (value: string) => void
  options: NeoSelectOption[]
  placeholder?: string
  error?: string
  enabled?: boolean
}

export function NeoSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Pilih...',
  error,
  enabled = true,
}: NeoSelectProps) {
  return (
    <View style={{ gap: 6, width: '100%', minWidth: 0 }}>
      {label ? (
        <Text style={{ fontWeight: '700', fontSize: 14, color: colors.foreground }}>{label}</Text>
      ) : null}
      <View
        style={{
          width: '100%',
          minHeight: 48,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          backgroundColor: colors.card,
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: enabled ? 1 : 0.6,
          ...shadows.sm,
        }}
      >
        <Picker
          enabled={enabled}
          selectedValue={value}
          onValueChange={(next) => onValueChange(next)}
          mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          dropdownIconColor={colors.foreground}
          style={{
            width: '100%',
            color: colors.foreground,
            backgroundColor: colors.card,
            ...(Platform.OS === 'android' ? { height: 48 } : undefined),
          }}
          itemStyle={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.foreground,
          }}
        >
          <Picker.Item label={placeholder} value="" color={colors.mutedForeground} />
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  )
}