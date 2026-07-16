import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import type { Output, Penerima } from '@pengawas/shared'
import {
  buildCollageSlots,
  buildProgressCollageCaption,
  buildProgressCollageMeta,
  countCollageFilled,
} from '@/lib/progress-collage'
import {
  saveStoryFrameHd,
  shareStoryFrameHd,
  STORY_HD,
} from '@/lib/story-capture'
import { copyStoryCaption, STORY_PREVIEW_WIDTH, type StoryShareContext } from '@/lib/story-share'
import { STORY_HEIGHT, STORY_WIDTH } from '@/lib/story-share-meta'
import { ProgressCollageFrame } from '@/components/pekerjaan/ProgressCollageFrame'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

type ProgressCollageShareModalProps = {
  visible: boolean
  slots: Array<{ slot: string; foto?: import('@pengawas/shared').Foto }>
  output: Output
  penerima?: Penerima | null
  context: StoryShareContext
  onClose: () => void
}

type BusyMode = 'share' | 'save' | null

/**
 * Preview + share/simpan kolase progress 0–100%.
 * Capture dari surface HD 1080×1920 (bukan scale preview).
 */
export function ProgressCollageShareModal({
  visible,
  slots,
  output,
  penerima,
  context,
  onClose,
}: ProgressCollageShareModalProps) {
  const { height, width } = useWindowDimensions()
  const previewRef = useRef<View>(null)
  const hdRef = useRef<View>(null)
  const [busy, setBusy] = useState<BusyMode>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [hdReady, setHdReady] = useState(false)

  const collageSlots = useMemo(() => buildCollageSlots(slots), [slots])
  const filled = useMemo(() => countCollageFilled(collageSlots), [collageSlots])
  const meta = useMemo(
    () => buildProgressCollageMeta({ slots, output, penerima, context }),
    [slots, output, penerima, context],
  )
  const caption = useMemo(
    () => buildProgressCollageCaption({ meta, filled }),
    [meta, filled],
  )
  const previewWidth = Math.min(STORY_PREVIEW_WIDTH, Math.max(240, width - 56))
  const isBusy = busy != null
  const canExport = filled > 0

  useEffect(() => {
    if (!visible) return
    setError(null)
    setCopied(false)
    setSavedMsg(null)
    setHdReady(filled === 0)
  }, [visible, filled, output.id, penerima?.id])

  const waitForHd = useCallback(async () => {
    if (!hdReady && filled > 0) return 800
    return 250
  }, [hdReady, filled])

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
    if (!canExport || isBusy) return
    setBusy('share')
    setError(null)
    setSavedMsg(null)
    try {
      const waitMs = await waitForHd()
      await shareStoryFrameHd(hdRef, { waitMs })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membagikan kolase.')
    } finally {
      setBusy(null)
    }
  }, [canExport, isBusy, waitForHd])

  const handleSave = useCallback(async () => {
    if (!canExport || isBusy) return
    setBusy('save')
    setError(null)
    setSavedMsg(null)
    try {
      const waitMs = await waitForHd()
      const result = await saveStoryFrameHd(hdRef, { waitMs, quality: 1 })
      setSavedMsg(
        result.method === 'gallery'
          ? `Tersimpan ke galeri (${STORY_HD.width}×${STORY_HD.height} HD)`
          : 'Tersimpan di folder dokumen app (izin galeri belum aktif)',
      )
      setTimeout(() => setSavedMsg(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan kolase HD.')
    } finally {
      setBusy(null)
    }
  }, [canExport, isBusy, waitForHd])

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

        {/* HD offscreen — di luar NeoSurface agar tidak ter-clip */}
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -STORY_WIDTH - 40,
            top: 0,
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            opacity: 1,
            overflow: 'hidden',
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ProgressCollageFrame
            ref={hdRef}
            meta={meta}
            slots={collageSlots}
            width={STORY_WIDTH}
            onAllImagesReady={() => setHdReady(true)}
            onImageError={() => setError('Sebagian foto gagal dimuat di canvas HD.')}
          />
        </View>

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
              KOLASE STORY
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground, marginBottom: 6 }}>
              Progress 0–100%
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 12 }}>
              Kolase 5 slot (0 · 25 · 50 · 75 · 100). Export nativ {STORY_HD.width}×{STORY_HD.height}.
              Slot kosong tetap ditampilkan sebagai placeholder.
              {filled > 0 ? ` · ${filled}/5 terisi` : ' · Belum ada foto di grup ini'}
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 14, paddingVertical: 8 }}>
              <View style={{ borderRadius: radius, backgroundColor: colors.background, ...shadows.lg }}>
                <ProgressCollageFrame
                  ref={previewRef}
                  meta={meta}
                  slots={collageSlots}
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
                disabled={isBusy || !canExport}
              />
              <NeoButton
                label={busy === 'share' ? 'Menyiapkan…' : 'Bagikan story'}
                variant="primary"
                onPress={() => void handleShare()}
                disabled={isBusy || !canExport}
              />
              <NeoButton label="Tutup" variant="ghost" onPress={onClose} disabled={isBusy} />
            </View>

            {isBusy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.foreground} />
                <Text style={{ fontWeight: '700', fontSize: 12 }}>
                  Merender kolase HD {STORY_HD.width}×{STORY_HD.height}…
                </Text>
              </View>
            ) : !canExport ? (
              <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 15 }}>
                Isi minimal 1 slot foto dulu untuk share kolase.
              </Text>
            ) : (
              <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 15 }}>
                Sama konsep story: bagikan ke Instagram/WhatsApp atau simpan ke galeri.
              </Text>
            )}
          </ScrollView>
        </NeoSurface>
      </View>
    </Modal>
  )
}
