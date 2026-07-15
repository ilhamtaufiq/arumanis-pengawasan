import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import {
  copyStoryCaption,
  shareStoryImageFile,
  STORY_HEIGHT,
  STORY_PREVIEW_WIDTH,
  STORY_WIDTH,
} from '@/lib/story-share'
import type { StoryShareMeta } from '@/lib/story-share-meta'
import { StoryFrameCard } from '@/components/pekerjaan/StoryFrameCard'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

type KegiatanStoryPreviewModalProps = {
  visible: boolean
  imageUri: string
  meta: StoryShareMeta | null
  caption: string
  onClose: () => void
}

type CaptureRefFn = (
  target: RefObject<View | null> | View,
  options?: {
    format?: 'png' | 'jpg' | 'webm' | 'raw'
    quality?: number
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64'
    width?: number
    height?: number
  },
) => Promise<string>

function loadCaptureRef(): CaptureRefFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-view-shot') as { captureRef?: CaptureRefFn }
  if (typeof mod.captureRef !== 'function') {
    throw new Error(
      'Capture bingkai tidak tersedia. Perbarui native build agar react-native-view-shot terpasang.',
    )
  }
  return mod.captureRef
}

/** Preview + share bingkai kegiatan lapangan (reuse StoryFrameCard). */
export function KegiatanStoryPreviewModal({
  visible,
  imageUri,
  meta,
  caption,
  onClose,
}: KegiatanStoryPreviewModalProps) {
  const { height, width } = useWindowDimensions()
  const frameRef = useRef<View>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [imageReady, setImageReady] = useState(false)

  const previewWidth = Math.min(STORY_PREVIEW_WIDTH, Math.max(240, width - 56))

  useEffect(() => {
    if (!visible) return
    setError(null)
    setCopied(false)
    setImageReady(!imageUri)
  }, [visible, imageUri])

  const handleCopy = useCallback(async () => {
    if (!caption.trim()) return
    try {
      await copyStoryCaption(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyalin caption.')
    }
  }, [caption])

  const handleShare = useCallback(async () => {
    if (!imageUri || !meta || busy) return
    setBusy(true)
    setError(null)
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      if (imageUri && !imageReady) {
        await new Promise((r) => setTimeout(r, 400))
      }
      if (!frameRef.current) {
        throw new Error('Bingkai belum siap. Tutup lalu buka lagi.')
      }
      const captureRef = loadCaptureRef()
      const framedUri = await captureRef(frameRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
      })
      await shareStoryImageFile(framedUri)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membagikan story.')
    } finally {
      setBusy(false)
    }
  }, [busy, imageReady, imageUri, meta])

  if (!meta) return null

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
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1,
                color: colors.mutedForeground,
                marginBottom: 4,
              }}
            >
              PREVIEW STORY
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground, marginBottom: 6 }}>
              Kegiatan lapangan
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 12 }}>
              Bingkai neobrutalism (logo Arumanis + Bidang AMS + @bidang_ams). Bagikan file berbingkai,
              caption disalin terpisah.
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 14, paddingVertical: 8 }}>
              <View style={{ borderRadius: radius, backgroundColor: colors.background, ...shadows.lg }}>
                <StoryFrameCard
                  ref={frameRef}
                  imageUri={imageUri}
                  meta={meta}
                  width={previewWidth}
                  onImageLoad={() => setImageReady(true)}
                  onImageError={() => {
                    setImageReady(false)
                    setError('Gagal memuat foto di bingkai.')
                  }}
                />
              </View>
            </View>

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
                CAPTION
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
                onPress={() => void handleCopy()}
                disabled={busy || !caption.trim()}
              />
              <NeoButton
                label={busy ? 'Menyiapkan…' : 'Bagikan story'}
                variant="primary"
                onPress={() => void handleShare()}
                disabled={busy || !imageUri}
              />
              <NeoButton label="Tutup" variant="ghost" onPress={onClose} disabled={busy} />
            </View>

            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.foreground} />
                <Text style={{ fontWeight: '700', fontSize: 12 }}>Merender bingkai 9:16…</Text>
              </View>
            ) : null}
          </ScrollView>
        </NeoSurface>
      </View>
    </Modal>
  )
}
