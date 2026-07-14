import { useEffect, useState, type ComponentType } from 'react'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import type { Foto } from '@pengawas/shared'
import { formatDateTime } from '@pengawas/shared/format'
import type { StoryShareContext } from '@/lib/story-share-meta'
import { NeoBadge, NeoButton, NeoSurface } from '@/components/ui'
import { colors, radius, shadows } from '@/theme/tokens'

type StoryShareModalProps = {
  visible: boolean
  foto: Foto | null
  context: StoryShareContext | null
  onClose: () => void
}

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

/**
 * Story share (view-shot / expo-sharing) di-load lazy saat user tap.
 * Jangan import statis — native module hilang di APK lama → tab foto blank/crash.
 */
function useLazyStoryShareModal(enabled: boolean) {
  const [Comp, setComp] = useState<ComponentType<StoryShareModalProps> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || Comp) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./StoryShareModal') as {
        StoryShareModal?: ComponentType<StoryShareModalProps>
      }
      if (!mod.StoryShareModal) {
        setLoadError('Modul bagikan story tidak ditemukan.')
        return
      }
      setComp(() => mod.StoryShareModal!)
      setLoadError(null)
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Fitur bagikan story membutuhkan aplikasi versi terbaru (native build).',
      )
    }
  }, [enabled, Comp])

  return { Comp, loadError }
}

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
  const { height } = useWindowDimensions()
  const [shareOpen, setShareOpen] = useState(false)
  const imageUri = foto?.foto_url || foto?.foto_thumb_url || ''
  const maxImageHeight = Math.min(height * 0.5, 420)
  const canShareStory = Boolean(storyContext && imageUri)
  const { Comp: StoryShareModal, loadError: shareLoadError } = useLazyStoryShareModal(shareOpen)

  if (!foto) return null

  return (
    <>
      <Modal visible={visible && !shareOpen} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 17, 17, 0.72)',
            justifyContent: 'center',
            padding: 16,
          }}
          onPress={onClose}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}
          >
            <NeoSurface shadow="lg" style={{ gap: 16, maxHeight: height * 0.9 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.mutedForeground }}>
                  PREVIEW FOTO
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>
                  {foto.keterangan || 'Foto pekerjaan'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  {formatDateTime(foto.created_at)}
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                <View
                  style={{
                    width: '100%',
                    height: maxImageHeight,
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: radius,
                    overflow: 'hidden',
                    backgroundColor: colors.muted,
                    ...shadows.sm,
                  }}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: colors.mutedForeground }}>
                        Gambar tidak tersedia
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 14 }}>Detail</Text>
                  {storyContext?.namaPaket ? (
                    <Text style={{ fontSize: 14 }}>
                      <Text style={{ color: colors.mutedForeground }}>Paket: </Text>
                      <Text style={{ fontWeight: '700' }}>{storyContext.namaPaket}</Text>
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ color: colors.mutedForeground }}>Output: </Text>
                    <Text style={{ fontWeight: '700' }}>
                      {foto.komponen?.komponen || String(foto.komponen_id ?? '-')}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ color: colors.mutedForeground }}>Slot: </Text>
                    <Text style={{ fontWeight: '700' }}>{foto.keterangan || '-'}</Text>
                  </Text>
                  {foto.penerima?.nama ? (
                    <Text style={{ fontSize: 14 }}>
                      <Text style={{ color: colors.mutedForeground }}>Penerima: </Text>
                      <Text style={{ fontWeight: '700' }}>{foto.penerima.nama}</Text>
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ color: colors.mutedForeground }}>Koordinat: </Text>
                    <Text style={{ fontWeight: '700' }}>{foto.koordinat?.trim() || '-'}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Validasi:</Text>
                    <NeoBadge tone={foto.validasi_koordinat ? 'success' : 'danger'}>
                      {foto.validasi_koordinat ? 'Valid' : 'Belum valid'}
                    </NeoBadge>
                  </View>
                  {foto.validasi_koordinat_message ? (
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                      {foto.validasi_koordinat_message}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {canShareStory ? (
                    <NeoButton
                      label="Bagikan Story"
                      variant="primary"
                      onPress={() => setShareOpen(true)}
                      disabled={isBusy}
                    />
                  ) : null}
                  {onEditKoordinat ? (
                    <NeoButton
                      label={foto.validasi_koordinat === false ? 'Perbaiki koordinat' : 'Edit koordinat'}
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
          </Pressable>
        </Pressable>
      </Modal>

      {shareOpen && visible ? (
        StoryShareModal ? (
          <StoryShareModal
            visible
            foto={foto}
            context={storyContext}
            onClose={() => setShareOpen(false)}
          />
        ) : (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(17, 17, 17, 0.72)',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <NeoSurface style={{ gap: 12, padding: 16 }}>
                <Text style={{ fontWeight: '800', fontSize: 16 }}>
                  {shareLoadError ? 'Bagikan story belum tersedia' : 'Memuat…'}
                </Text>
                <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
                  {shareLoadError ||
                    'Menyiapkan fitur bagikan. Jika stuck, perbarui APK native (bukan hanya OTA).'}
                </Text>
                <NeoButton label="Tutup" variant="primary" onPress={() => setShareOpen(false)} />
              </NeoSurface>
            </View>
          </Modal>
        )
      ) : null}
    </>
  )
}
