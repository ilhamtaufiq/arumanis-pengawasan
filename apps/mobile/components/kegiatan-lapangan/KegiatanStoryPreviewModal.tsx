import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { copyStoryCaption, STORY_PREVIEW_WIDTH } from '@/lib/story-share'
import {
  saveStoryFrameHd,
  shareStoryFrameHd,
  STORY_HD,
} from '@/lib/story-capture'
import type { StoryShareMeta } from '@/lib/story-share-meta'
import { StoryFrameCard } from '@/components/pekerjaan/StoryFrameCard'
import { StoryHdCaptureSurface } from '@/components/pekerjaan/StoryHdCaptureSurface'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

type KegiatanStoryPreviewModalProps = {
  visible: boolean
  imageUri: string
  meta: StoryShareMeta | null
  caption: string
  onClose: () => void
}

type BusyMode = 'share' | 'save' | null

/** Preview + share/simpan — capture dari surface HD 1080×1920 (bukan preview). */
export function KegiatanStoryPreviewModal({
  visible,
  imageUri,
  meta,
  caption,
  onClose,
}: KegiatanStoryPreviewModalProps) {
  const { height, width } = useWindowDimensions()
  /** Preview kecil untuk UI */
  const previewRef = useRef<View>(null)
  /** Capture target — full 1080×1920 offscreen */
  const hdRef = useRef<View>(null)
  const [busy, setBusy] = useState<BusyMode>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [hdImageReady, setHdImageReady] = useState(false)

  const previewWidth = Math.min(STORY_PREVIEW_WIDTH, Math.max(240, width - 56))
  const isBusy = busy != null

  useEffect(() => {
    if (!visible) return
    setError(null)
    setCopied(false)
    setSavedMsg(null)
    setHdImageReady(!imageUri)
  }, [visible, imageUri])

  const waitForHdReady = useCallback(async () => {
    // Surface HD butuh waktu layout + decode image di 1080px
    if (imageUri && !hdImageReady) {
      return 700
    }
    return 200
  }, [hdImageReady, imageUri])

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
    if (!imageUri || !meta || isBusy) return
    setBusy('share')
    setError(null)
    setSavedMsg(null)
    try {
      const waitMs = await waitForHdReady()
      await shareStoryFrameHd(hdRef, { waitMs })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membagikan story.')
    } finally {
      setBusy(null)
    }
  }, [isBusy, imageUri, meta, waitForHdReady])

  const handleSave = useCallback(async () => {
    if (!imageUri || !meta || isBusy) return
    setBusy('save')
    setError(null)
    setSavedMsg(null)
    try {
      const waitMs = await waitForHdReady()
      const result = await saveStoryFrameHd(hdRef, { waitMs, quality: 1 })
      setSavedMsg(
        result.method === 'gallery'
          ? `Tersimpan ke galeri (${STORY_HD.width}×${STORY_HD.height} HD)`
          : 'Tersimpan di folder dokumen app (izin galeri belum aktif — rebuild native untuk simpan langsung ke galeri)',
      )
      setTimeout(() => setSavedMsg(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan story HD.')
    } finally {
      setBusy(null)
    }
  }, [isBusy, imageUri, meta, waitForHdReady])

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
        <Pressable style={{ flex: 1 }} onPress={isBusy ? undefined : onClose} />

        {/*
          HD surface di luar NeoSurface (overflow clip bisa cegah render off-screen).
          Harus di tree modal agar snapshot view-shot valid.
        */}
        <StoryHdCaptureSurface
          ref={hdRef}
          imageUri={imageUri}
          meta={meta}
          onImageLoad={() => setHdImageReady(true)}
          onImageError={() => {
            setHdImageReady(false)
            setError('Gagal memuat foto di bingkai HD.')
          }}
        />

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
              Export nativ {STORY_HD.width}×{STORY_HD.height} (bukan scale preview). Pill kegiatan +
              keterangan (jika diisi). Bagikan atau simpan ke galeri.
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 14, paddingVertical: 8 }}>
              <View style={{ borderRadius: radius, backgroundColor: colors.background, ...shadows.lg }}>
                <StoryFrameCard
                  ref={previewRef}
                  imageUri={imageUri}
                  meta={meta}
                  width={previewWidth}
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

            {savedMsg ? (
              <View
                style={{
                  backgroundColor: '#ecfdf5',
                  borderWidth: 2,
                  borderColor: '#059669',
                  borderRadius: radius,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#064e3b', fontSize: 13 }}>{savedMsg}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <NeoButton
                label={copied ? 'Caption disalin ✓' : 'Salin caption'}
                variant="secondary"
                onPress={() => void handleCopy()}
                disabled={isBusy || !caption.trim()}
              />
              <NeoButton
                label={busy === 'save' ? 'Menyimpan HD…' : 'Simpan HD'}
                variant="neutral"
                onPress={() => void handleSave()}
                disabled={isBusy || !imageUri}
              />
              <NeoButton
                label={busy === 'share' ? 'Menyiapkan…' : 'Bagikan story'}
                variant="primary"
                onPress={() => void handleShare()}
                disabled={isBusy || !imageUri}
              />
              <NeoButton label="Tutup" variant="ghost" onPress={onClose} disabled={isBusy} />
            </View>

            {isBusy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.foreground} />
                <Text style={{ fontWeight: '700', fontSize: 12 }}>
                  {busy === 'save'
                    ? `Merender nativ ${STORY_HD.width}×${STORY_HD.height}…`
                    : `Merender nativ HD ${STORY_HD.width}×${STORY_HD.height}…`}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 15 }}>
                Capture dari canvas 1080×1920 (bukan zoom preview). Instagram tetap bisa
                kompres ulang di sisi mereka.
              </Text>
            )}
          </ScrollView>
        </NeoSurface>
      </View>
    </Modal>
  )
}
