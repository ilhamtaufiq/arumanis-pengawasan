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
 * Preview foto + tombol Bagikan Story (selalu terlihat di bawah gambar).
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
  const { height } = useWindowDimensions()
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
  const maxImageHeight = Math.min(height * 0.38, 320)
  const displayFoto = resolvedFoto ?? foto

  if (!displayFoto) return null

  return (
    <>
      <Modal visible={visible && !shareOpen} transparent animationType="fade" onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 17, 17, 0.78)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
          <NeoSurface
            shadow="lg"
            style={{
              gap: 12,
              maxHeight: height * 0.9,
              width: '100%',
              maxWidth: 560,
              alignSelf: 'center',
              zIndex: 2,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.mutedForeground }}>
                PREVIEW FOTO
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>
                {displayFoto.keterangan || 'Foto pekerjaan'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                {formatDateTime(displayFoto.created_at)}
              </Text>
            </View>

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
                alignItems: 'center',
                justifyContent: 'center',
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
                <Text style={{ fontWeight: '700', color: colors.mutedForeground, padding: 12, textAlign: 'center' }}>
                  Gambar tidak tersedia
                </Text>
              )}
            </View>

            {/* Share langsung di bawah gambar — tidak perlu scroll jauh */}
            <NeoButton
              label={imageUri ? 'Bagikan Story' : loadingUrl ? 'Memuat gambar…' : 'Bagikan Story (tanpa gambar)'}
              variant="primary"
              fullWidth
              onPress={() => setShareOpen(true)}
              disabled={isBusy || loadingUrl}
            />
            <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: 'center', lineHeight: 15 }}>
              Bagikan ke Instagram Stories / WhatsApp Status
            </Text>

            <ScrollView
              style={{ maxHeight: height * 0.28 }}
              showsVerticalScrollIndicator
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            >
              <View style={{ gap: 6 }}>
                {storyContext?.namaPaket ? (
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ color: colors.mutedForeground }}>Paket: </Text>
                    <Text style={{ fontWeight: '700' }}>{storyContext.namaPaket}</Text>
                  </Text>
                ) : null}
                <Text style={{ fontSize: 14 }}>
                  <Text style={{ color: colors.mutedForeground }}>Output: </Text>
                  <Text style={{ fontWeight: '700' }}>
                    {displayFoto.komponen?.komponen || String(displayFoto.komponen_id ?? '-')}
                  </Text>
                </Text>
                <Text style={{ fontSize: 14 }}>
                  <Text style={{ color: colors.mutedForeground }}>Slot: </Text>
                  <Text style={{ fontWeight: '700' }}>{displayFoto.keterangan || '-'}</Text>
                </Text>
                {displayFoto.penerima?.nama ? (
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ color: colors.mutedForeground }}>Penerima: </Text>
                    <Text style={{ fontWeight: '700' }}>{displayFoto.penerima.nama}</Text>
                  </Text>
                ) : null}
                <Text style={{ fontSize: 14 }}>
                  <Text style={{ color: colors.mutedForeground }}>Koordinat: </Text>
                  <Text style={{ fontWeight: '700' }}>{displayFoto.koordinat?.trim() || '-'}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Validasi:</Text>
                  <NeoBadge tone={displayFoto.validasi_koordinat ? 'success' : 'danger'}>
                    {displayFoto.validasi_koordinat ? 'Valid' : 'Belum valid'}
                  </NeoBadge>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {onEditKoordinat ? (
                  <NeoButton
                    label={
                      displayFoto.validasi_koordinat === false ? 'Perbaiki koordinat' : 'Edit koordinat'
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
