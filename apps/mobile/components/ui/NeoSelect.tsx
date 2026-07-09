import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react-native'
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NeoButton } from './NeoButton'
import { NeoSurface } from './NeoSurface'
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
  const [open, setOpen] = useState(false)
  const { height, width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )
  const displayLabel = selectedOption?.label ?? placeholder
  const sheetWidth = Math.min(560, width - 16)
  const listMaxHeight = Math.min(height * 0.5, 360)

  function close() {
    setOpen(false)
  }

  function handleSelect(nextValue: string) {
    onValueChange(nextValue)
    close()
  }

  return (
    <>
      <View style={{ gap: 6, width: '100%', minWidth: 0, alignSelf: 'stretch' }}>
        {label ? (
          <Text style={{ fontWeight: '700', fontSize: 14, color: colors.foreground }}>{label}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `${label}: ${displayLabel}` : displayLabel}
          accessibilityState={{ disabled: !enabled, expanded: open }}
          disabled={!enabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            {
              width: '100%',
              minHeight: 48,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              opacity: enabled ? 1 : 0.6,
            },
            shadows.sm,
            pressed && enabled ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
          ]}
        >
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              fontWeight: selectedOption ? '700' : '500',
              color: selectedOption ? colors.foreground : colors.mutedForeground,
              lineHeight: 22,
            }}
            numberOfLines={3}
          >
            {displayLabel}
          </Text>
          <ChevronDown size={18} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 17, 17, 0.72)',
            justifyContent: 'flex-end',
          }}
          onPress={close}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: sheetWidth,
              alignSelf: 'center',
              paddingHorizontal: 8,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <NeoSurface shadow="lg" style={{ gap: 12, maxHeight: height * 0.75 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>PILIH</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, lineHeight: 26 }}>
                  {label ?? placeholder}
                </Text>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={{ maxHeight: listMaxHeight }}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {options.map((option) => {
                  const selected = option.value === value
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => handleSelect(option.value)}
                      style={({ pressed }) => [
                        {
                          minHeight: 48,
                          borderWidth: 2,
                          borderColor: colors.border,
                          borderRadius: radius,
                          backgroundColor: selected ? colors.main : colors.card,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          justifyContent: 'center',
                          width: '100%',
                        },
                        pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: selected ? '800' : '600',
                          color: colors.foreground,
                          lineHeight: 22,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <NeoButton label="Tutup" variant="neutral" fullWidth onPress={close} />
            </NeoSurface>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}