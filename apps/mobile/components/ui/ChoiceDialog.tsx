import { Modal, Pressable, Text, View } from 'react-native'
import { NeoButton } from './NeoButton'
import { NeoSurface } from './NeoSurface'
import { colors } from '@/theme/tokens'

export type ChoiceDialogOption = {
  label: string
  onPress: () => void
  destructive?: boolean
  variant?: 'primary' | 'secondary' | 'neutral' | 'danger'
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
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
                <NeoButton
                  key={option.label}
                  label={option.label}
                  fullWidth
                  variant={option.variant ?? (option.destructive ? 'danger' : 'neutral')}
                  onPress={() => {
                    option.onPress()
                  }}
                />
              ))}
            </View>
            <NeoButton label="Batal" variant="ghost" fullWidth onPress={onClose} />
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}