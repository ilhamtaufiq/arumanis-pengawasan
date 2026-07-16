import { useEffect, useMemo, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Foto } from '@pengawas/shared'
import { formatDateTime } from '@pengawas/shared/format'
import type { StoryShareContext } from '@/lib/story-share-meta'
import { getFoto } from '@/lib/api'
import { StoryShareModal } from '@/components/pekerjaan/StoryShareModal'
import { NeoBadge, NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

type FotoPreviewModalProps = {
  visible: boolean
  foto: Foto | null
  /** Konteks pekerjaan untuk bingkai story (nama paket, lokasi, TA). */
  storyContext?: StoryShareContext | null
  onClose: () => void
  onReplace: () => void
  /** Edit koordinat existing (invalid GPS) — tanpa ganti file */
  onEditKoordinat?: () => void
  onDelete: () => void
  isBusy?: boolean
}

function resolveImageUri(foto: Foto | null | undefined): string {
  if (!foto) return ''
  const candidates = [
    foto.foto_url,
    foto.foto_thumb_url,
    (foto as { url?: string | null }).url,
    (foto as { media_url?: string | null }).media_url,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Preview foto — satu ScrollView penuh (hindari nested scroll Android).
 * Tombol Bagikan Story di bawah gambar, di dalam scroll yang sama.
 */
export function FotoPreviewModal({
  visible,
  foto,
  storyContext = null,
  onClose,
  onReplace,
  onEditKoordinat,
  onDelete,
  isBusy = false,
}: FotoPreviewModalProps) {
  const { height, width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [shareOpen, setShareOpen] = useState(false)
  const [resolvedFoto, setResolvedFoto] = useState<Foto | null>(foto)
  const [loadingUrl, setLoadingUrl] = useState(false)

  useEffect(() => {
    setResolvedFoto(foto)
    setShareOpen(false)
  }, [foto?.id, visible])

  // Jika URL hilang (detail di-slim), fetch 1 foto agar preview + share jalan
  useEffect(() => {
    if (!visible || !foto?.id) return
    const hasUrl = Boolean(resolveImageUri(foto))
    if (hasUrl) {
      setResolvedFoto(foto)
      return
    }

    let cancelled = false
    setLoadingUrl(true)
    void getFoto(foto.id)
      .then((full) => {
        if (cancelled || !full) return
        setResolvedFoto({
          ...foto,
          ...full,
          foto_url: full.foto_url || full.foto_thumb_url || foto.foto_url,
          foto_thumb_url: full.foto_thumb_url || full.foto_url || foto.foto_thumb_url,
        })
      })
      .catch(() => {
        if (!cancelled) setResolvedFoto(foto)
      })
      .finally(() => {
        if (!cancelled) setLoadingUrl(false)
      })

    return () => {
      cancelled = true
    }
  }, [visible, foto?.id, foto?.foto_url, foto?.foto_thumb_url])

  const imageUri = useMemo(() => resolveImageUri(resolvedFoto), [resolvedFoto])
  const displayFoto = resolvedFoto ?? foto

  const sheetMaxHeight = height - insets.top - insets.bottom - 24
  const sheetWidth = Math.min(560, width - 32)
  const imageHeight = Math.min(Math.round(sheetMaxHeight * 0.36), 280)

  if (!displayFoto) return null

  return (
    <>
      <Modal
        visible={visible && !shareOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 17, 17, 0.78)',
            justifyContent: 'center',
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: 16,
          }}
        >
          {/* Backdrop — di belakang sheet, tidak menutupi gesture scroll */}
          <Pressable
            accessibilityLabel="Tutup preview"
            onPress={onClose}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />

          <View
            style={{
              width: sheetWidth,
              maxHeight: sheetMaxHeight,
              alignSelf: 'center',
              // Penting: batasi tinggi agar ScrollView anak punya batas & bisa scroll
              flexShrink: 1,
            }}
            // Blokir tap backdrop saat tekan isi sheet
            onStartShouldSetResponder={() => true}
          >
            <NeoSurface
              shadow="lg"
              style={{
                // Jangan pakai gap di parent ScrollView (Android sering rusak)
                maxHeight: sheetMaxHeight,
                overflow: 'hidden',
                padding: 0,
              }}
            >
              <ScrollView
                style={{ maxHeight: sheetMaxHeight }}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 20,
                }}
                showsVerticalScrollIndicator
                bounces
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                // Scroll di dalam modal Android
                scrollEventThrottle={16}
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
                    PREVIEW FOTO
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 4 }}>
                    {displayFoto.keterangan || 'Foto pekerjaan'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                    {formatDateTime(displayFoto.created_at)}
                  </Text>
                </View>

                <View
                  style={{
                    width: '100%',
                    height: imageHeight,
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: radius,
                    overflow: 'hidden',
                    backgroundColor: colors.muted,
                    ...shadows.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  {loadingUrl ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.mutedForeground,
                        padding: 12,
                        textAlign: 'center',
                      }}
                    >
                      Gambar tidak tersedia
                    </Text>
                  )}
                </View>

                {/* Share di atas — terlihat tanpa scroll jauh */}
                <View style={{ marginBottom: 14 }}>
                  <NeoButton
                    label={
                      imageUri
                        ? 'Story HD (bagikan / simpan)'
                        : loadingUrl
                          ? 'Memuat gambar…'
                          : 'Story (tanpa gambar)'
                    }
                    variant="primary"
                    fullWidth
                    onPress={() => setShareOpen(true)}
                    disabled={isBusy || loadingUrl}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.mutedForeground,
                      textAlign: 'center',
                      lineHeight: 15,
                      marginTop: 6,
                    }}
                  >
                    Bingkai AMS · 1080×1920 · Instagram / WhatsApp / simpan galeri
                  </Text>
                </View>

                <View style={{ marginBottom: 14 }}>
                  {storyContext?.namaPaket ? (
                    <Text style={{ fontSize: 14, marginBottom: 6 }}>
                      <Text style={{ color: colors.mutedForeground }}>Paket: </Text>
                      <Text style={{ fontWeight: '700' }}>{storyContext.namaPaket}</Text>
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 14, marginBottom: 6 }}>
                    <Text style={{ color: colors.mutedForeground }}>Output: </Text>
                    <Text style={{ fontWeight: '700' }}>
                      {displayFoto.komponen?.komponen || String(displayFoto.komponen_id ?? '-')}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 14, marginBottom: 6 }}>
                    <Text style={{ color: colors.mutedForeground }}>Slot: </Text>
                    <Text style={{ fontWeight: '700' }}>{displayFoto.keterangan || '-'}</Text>
                  </Text>
                  {displayFoto.penerima?.nama ? (
                    <Text style={{ fontSize: 14, marginBottom: 6 }}>
                      <Text style={{ color: colors.mutedForeground }}>Penerima: </Text>
                      <Text style={{ fontWeight: '700' }}>{displayFoto.penerima.nama}</Text>
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 14, marginBottom: 6 }}>
                    <Text style={{ color: colors.mutedForeground }}>Koordinat: </Text>
                    <Text style={{ fontWeight: '700' }}>{displayFoto.koordinat?.trim() || '-'}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Validasi:</Text>
                    <NeoBadge tone={displayFoto.validasi_koordinat ? 'success' : 'danger'}>
                      {displayFoto.validasi_koordinat ? 'Valid' : 'Belum valid'}
                    </NeoBadge>
                  </View>
                  {displayFoto.validasi_koordinat_message ? (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6, lineHeight: 17 }}>
                      {displayFoto.validasi_koordinat_message}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {onEditKoordinat ? (
                    <NeoButton
                      label={
                        displayFoto.validasi_koordinat === false
                          ? 'Perbaiki koordinat'
                          : 'Edit koordinat'
                      }
                      variant="secondary"
                      onPress={onEditKoordinat}
                      disabled={isBusy}
                    />
                  ) : null}
                  <NeoButton label="Ganti foto" variant="neutral" onPress={onReplace} disabled={isBusy} />
                  <NeoButton label="Hapus foto" variant="danger" onPress={onDelete} disabled={isBusy} />
                  <NeoButton label="Tutup" variant="ghost" onPress={onClose} disabled={isBusy} />
                </View>
              </ScrollView>
            </NeoSurface>
          </View>
        </View>
      </Modal>

      <StoryShareModal
        visible={shareOpen && visible}
        foto={
          displayFoto
            ? {
                ...displayFoto,
                foto_url: imageUri || displayFoto.foto_url,
                foto_thumb_url: displayFoto.foto_thumb_url || imageUri || null,
              }
            : null
        }
        context={
          storyContext ?? {
            namaPaket: 'Dokumentasi lapangan',
          }
        }
        onClose={() => setShareOpen(false)}
      />
    </>
  )
}
