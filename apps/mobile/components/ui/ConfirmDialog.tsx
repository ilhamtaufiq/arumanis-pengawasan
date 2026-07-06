import { Modal, Pressable, Text, View } from 'react-native'
import { NeoButton } from './NeoButton'
import { NeoSurface } from './NeoSurface'
import { colors } from '@/theme/tokens'

type ConfirmDialogProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  isBusy?: boolean
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  destructive = false,
  onConfirm,
  onCancel,
  isBusy = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
        onPress={onCancel}
      >
        <Pressable onPress={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <NeoSurface shadow="lg" style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{title}</Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{message}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <NeoButton label={cancelLabel} variant="neutral" onPress={onCancel} disabled={isBusy} />
              <NeoButton
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                disabled={isBusy}
              />
            </View>
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}