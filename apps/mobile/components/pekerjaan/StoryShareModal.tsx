import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import type { Foto } from '@pengawas/shared'
import {
  buildStoryCaption,
  buildStoryShareMeta,
  copyStoryCaption,
  shareStoryImageFile,
  type StoryShareContext,
} from '@/lib/story-share'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type StoryShareModalProps = {
  visible: boolean
  foto: Foto | null
  context: StoryShareContext | null
  onClose: () => void
}

/**
 * Bagikan FOTO (file) ke Instagram Story / WhatsApp Status.
 * Caption ditampilkan + bisa disalin — tidak mengirim link/URL publik.
 */
export function StoryShareModal({ visible, foto, context, onClose }: StoryShareModalProps) {
  const { height } = useWindowDimensions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const imageUri = foto?.foto_url || foto?.foto_thumb_url || ''
  const meta = useMemo(() => {
    if (!foto || !context) return null
    return buildStoryShareMeta(foto, context)
  }, [foto, context])

  const caption = useMemo(() => (meta ? buildStoryCaption(meta) : ''), [meta])

  const handleCopyCaption = useCallback(async () => {
    if (!caption) return
    setError(null)
    try {
      await copyStoryCaption(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyalin caption.')
    }
  }, [caption])

  const handleSharePhoto = useCallback(async () => {
    if (!imageUri || busy) return
    setBusy(true)
    setError(null)
    try {
      // Share file lokal saja (URL remote di-download dulu di ensureLocalImageFile)
      await shareStoryImageFile(imageUri)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membagikan foto.')
    } finally {
      setBusy(false)
    }
  }, [busy, imageUri])

  if (!foto || !meta) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.78)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={busy ? undefined : onClose} />
        <NeoSurface
          shadow="lg"
          style={{
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomWidth: 0,
            maxHeight: height * 0.92,
            paddingBottom: 20,
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1,
                  color: colors.mutedForeground,
                  marginBottom: 4,
                }}
              >
                BAGIKAN FOTO
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground, marginBottom: 6 }}>
                Instagram Story / WhatsApp Status
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
                Membagikan file foto (bukan link). Pilih Instagram atau WhatsApp di menu berbagi.
                Caption disalin terpisah, lalu tempel di story bila perlu.
              </Text>
            </View>

            {imageUri ? (
              <View
                style={{
                  width: '100%',
                  height: Math.min(height * 0.32, 280),
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: radius,
                  overflow: 'hidden',
                  backgroundColor: colors.muted,
                  marginBottom: 12,
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <View
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.card,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: colors.mutedForeground,
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                CAPTION (salin, bukan link)
              </Text>
              <Text
                selectable
                style={{ fontSize: 13, lineHeight: 19, color: colors.foreground, fontWeight: '600' }}
              >
                {caption || '-'}
              </Text>
            </View>

            {error ? (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderWidth: 2,
                  borderColor: '#dc2626',
                  borderRadius: radius,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#7f1d1d', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <NeoButton
                label={copied ? 'Caption disalin ✓' : 'Salin caption'}
                variant="secondary"
                onPress={() => void handleCopyCaption()}
                disabled={busy || !caption}
              />
              <NeoButton
                label={busy ? 'Menyiapkan foto…' : 'Bagikan foto'}
                variant="primary"
                onPress={() => void handleSharePhoto()}
                disabled={busy || !imageUri}
              />
              <NeoButton label="Tutup" variant="ghost" onPress={onClose} disabled={busy} />
            </View>

            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.foreground} />
                <Text style={{ fontWeight: '700', fontSize: 12 }}>
                  Menyiapkan file foto (bukan URL)…
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 15 }}>
                Tips: ketuk Salin caption → Bagikan foto → pilih Instagram/WhatsApp → tempel caption di
                story.
              </Text>
            )}
          </ScrollView>
        </NeoSurface>
      </View>
    </Modal>
  )
}
