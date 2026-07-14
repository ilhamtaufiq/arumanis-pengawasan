import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { captureRef } from 'react-native-view-shot'
import type { Foto } from '@pengawas/shared'
import {
  buildStoryShareMeta,
  shareStoryImage,
  STORY_PREVIEW_WIDTH,
  type StoryShareContext,
} from '@/lib/story-share'
import { StoryFrameCard } from '@/components/pekerjaan/StoryFrameCard'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type StoryShareModalProps = {
  visible: boolean
  foto: Foto | null
  context: StoryShareContext | null
  onClose: () => void
}

export function StoryShareModal({ visible, foto, context, onClose }: StoryShareModalProps) {
  const frameRef = useRef<View>(null)
  const { height } = useWindowDimensions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageUri = foto?.foto_url || foto?.foto_thumb_url || ''
  const meta = useMemo(() => {
    if (!foto || !context) return null
    return buildStoryShareMeta(foto, context)
  }, [foto, context])

  const handleShare = useCallback(async () => {
    if (!frameRef.current || !meta) return
    setBusy(true)
    setError(null)
    try {
      // pixelRatio ~3 → mendekati 1080px lebar dari preview 320
      const uri = await captureRef(frameRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        // 1080/320 ≈ 3.375 — biarkan native scale
        width: 1080,
        height: 1920,
      })
      await shareStoryImage(uri, `${meta.title} · ${meta.slotLine}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat atau membagikan story.')
    } finally {
      setBusy(false)
    }
  }, [meta])

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
            gap: 12,
            paddingBottom: 20,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.mutedForeground }}>
              SHARE STORY · 9:16
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground }}>
              Instagram / WhatsApp
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
              Bingkai neobrutalism + info pekerjaan. Pilih Instagram Stories atau Status WhatsApp di menu bagikan.
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', paddingVertical: 8, gap: 12 }}
          >
            <View
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                overflow: 'hidden',
                backgroundColor: colors.muted,
              }}
            >
              <StoryFrameCard ref={frameRef} imageUri={imageUri} meta={meta} width={STORY_PREVIEW_WIDTH} />
            </View>

            {error ? (
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#fef2f2',
                  borderWidth: 2,
                  borderColor: '#dc2626',
                  borderRadius: radius,
                  padding: 10,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#7f1d1d', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <NeoButton
              label={busy ? 'Menyiapkan…' : 'Bagikan Story'}
              variant="primary"
              onPress={() => void handleShare()}
              disabled={busy || !imageUri}
            />
            <NeoButton label="Batal" variant="ghost" onPress={onClose} disabled={busy} />
          </View>

          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={colors.foreground} />
              <Text style={{ fontWeight: '700', fontSize: 12 }}>Render bingkai 1080×1920…</Text>
            </View>
          ) : null}
        </NeoSurface>
      </View>
    </Modal>
  )
}
