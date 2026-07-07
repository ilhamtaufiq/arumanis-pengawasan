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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const sheetWidth = Math.min(560, width - 16)
  const sheetMaxHeight = Math.min(height * 0.9, height - insets.top - 12)

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
        <View style={{ flex: 1, backgroundColor: 'rgba(17, 17, 17, 0.78)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />

          <View
            style={{
              width: sheetWidth,
              maxHeight: sheetMaxHeight,
              alignSelf: 'center',
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <NeoSurface
              shadow="lg"
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                gap: 14,
                maxHeight: sheetMaxHeight,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>FORM</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, lineHeight: 28 }}>
                  {title}
                </Text>
                {description ? (
                  <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{description}</Text>
                ) : null}
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={{ gap: 16, paddingBottom: 4 }}
                style={{ flexGrow: 0 }}
              >
                {children}
              </ScrollView>

              {footer ? (
                <View
                  style={{
                    gap: 10,
                    paddingTop: 8,
                    borderTopWidth: 2,
                    borderTopColor: colors.border,
                  }}
                >
                  {footer}
                </View>
              ) : null}
            </NeoSurface>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}