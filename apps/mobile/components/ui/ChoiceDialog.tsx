import { Modal, Pressable, Text, View } from 'react-native'
import { NeoButton } from './NeoButton'
import { NeoSurface } from './NeoSurface'
import { colors, radius } from '@/theme/tokens'

export type ChoiceDialogOption = {
  label: string
  onPress: () => void
  destructive?: boolean
}

type ChoiceDialogProps = {
  visible: boolean
  title: string
  message?: string
  options: ChoiceDialogOption[]
  onClose: () => void
}

export function ChoiceDialog({ visible, title, message, options, onClose }: ChoiceDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.72)',
          justifyContent: 'center',
          padding: 16,
        }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <NeoSurface shadow="lg" style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{title}</Text>
              {message ? (
                <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{message}</Text>
              ) : null}
            </View>
            <View style={{ gap: 8 }}>
              {options.map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    option.onPress()
                    onClose()
                  }}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: radius,
                    backgroundColor: option.destructive ? colors.danger : colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 15,
                      color: option.destructive ? '#ffffff' : colors.foreground,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <NeoButton label="Batal" variant="ghost" onPress={onClose} />
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}