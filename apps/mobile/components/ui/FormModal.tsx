import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { NeoSurface } from './NeoSurface'
import { colors } from '@/theme/tokens'

type FormModalProps = {
  visible: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function FormModal({ visible, title, description, onClose, children, footer }: FormModalProps) {
  const { width } = useWindowDimensions()
  const sheetMaxWidth = Math.min(560, width - 24)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 17, 17, 0.72)',
            justifyContent: 'flex-end',
          }}
          onPress={onClose}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: sheetMaxWidth,
              alignSelf: 'center',
              maxHeight: '92%',
            }}
          >
            <NeoSurface
              shadow="lg"
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                gap: 16,
                paddingBottom: Platform.OS === 'ios' ? 24 : 16,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>FORM</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{title}</Text>
                {description ? (
                  <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{description}</Text>
                ) : null}
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
                style={{ flexGrow: 0 }}
              >
                {children}
              </ScrollView>

              {footer ? <View style={{ gap: 10 }}>{footer}</View> : null}
            </NeoSurface>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}