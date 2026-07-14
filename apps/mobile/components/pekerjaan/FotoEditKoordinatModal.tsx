import { useEffect, useMemo, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Foto } from '@pengawas/shared'
import { hasParsableKoordinat } from '@pengawas/shared/koordinat'
import { validateKoordinat } from '@/lib/api'
import { useIsOnline } from '@/hooks/useIsOnline'
import {
  buildKoordinatValidationApiFailure,
  buildKoordinatValidationFromApi,
  buildKoordinatValidationOffline,
  canUploadFotoWithKoordinat,
  koordinatValidationTone,
  type KoordinatValidationUi,
} from '@/lib/koordinat-upload-policy'
import { NeoButton, NeoInput, NeoSurface } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type FotoEditKoordinatModalProps = {
  visible: boolean
  foto: Foto | null
  pekerjaanId: number
  onClose: () => void
  onSave: (koordinat: string) => void
  isSaving?: boolean
  errorMessage?: string | null
}

function normalizeProgress(value?: string | null): string {
  const options = ['0%', '25%', '50%', '75%', '100%'] as const
  if (!value) return '0%'
  const base = (String(value).split('|')[0] ?? '').trim()
  if ((options as readonly string[]).includes(base)) return base
  if ((options as readonly string[]).includes(`${base}%`)) return `${base}%`
  return base || '0%'
}

export function FotoEditKoordinatModal({
  visible,
  foto,
  pekerjaanId,
  onClose,
  onSave,
  isSaving = false,
  errorMessage = null,
}: FotoEditKoordinatModalProps) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const isOnline = useIsOnline()
  const [koordinat, setKoordinat] = useState('')
  const [validation, setValidation] = useState<KoordinatValidationUi | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !foto) {
      setKoordinat('')
      setValidation(null)
      setLocalError(null)
      return
    }
    setKoordinat(foto.koordinat?.trim() || '')
    setValidation(null)
    setLocalError(null)
  }, [visible, foto])

  useEffect(() => {
    if (!visible) return
    const trimmed = koordinat.trim()
    if (!trimmed || !hasParsableKoordinat(trimmed)) {
      setValidation(null)
      return
    }

    if (!isOnline) {
      setValidation(buildKoordinatValidationOffline())
      return
    }

    let cancelled = false
    setValidation({
      valid: false,
      message: 'Memvalidasi koordinat...',
      loading: true,
      allowUpload: false,
    })

    const timer = setTimeout(() => {
      validateKoordinat(pekerjaanId, trimmed)
        .then((result) => {
          if (cancelled) return
          setValidation(buildKoordinatValidationFromApi(result))
        })
        .catch(() => {
          if (cancelled) return
          setValidation(buildKoordinatValidationApiFailure())
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [koordinat, visible, pekerjaanId, isOnline])

  const canSave = useMemo(
    () =>
      canUploadFotoWithKoordinat({
        hasAsset: true,
        koordinat,
        isUploading: isSaving,
        isLocating: false,
        validation,
      }) &&
      // Untuk perbaiki GPS invalid, wajib valid di desa (ketat)
      Boolean(validation && !validation.loading && validation.valid),
    [koordinat, validation, isSaving],
  )

  if (!foto) return null

  const imageUri = foto.foto_url || foto.foto_thumb_url || ''
  const tone = koordinatValidationTone(validation)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.72)',
          justifyContent: 'center',
          padding: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ width: Math.min(560, width), maxHeight: height * 0.9, alignSelf: 'center' }}
        >
          <NeoSurface shadow="lg" style={{ gap: 14, maxHeight: height * 0.9 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.mutedForeground }}>
                EDIT KOORDINAT
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>
                {foto.komponen?.komponen || 'Foto pekerjaan'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                Slot {normalizeProgress(foto.keterangan)}
                {foto.unit_index != null && Number(foto.unit_index) > 0 ? ` · Unit ${foto.unit_index}` : ''}
                {' · '}foto tetap, hanya GPS diubah
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {imageUri ? (
                <View
                  style={{
                    height: 140,
                    borderRadius: radius,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                  }}
                >
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              ) : null}

              {foto.validasi_koordinat_message ? (
                <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13 }}>
                  {foto.validasi_koordinat_message}
                </Text>
              ) : null}

              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 13 }}>Koordinat (lat, lng)</Text>
                <NeoInput
                  value={koordinat}
                  onChangeText={setKoordinat}
                  placeholder="-6.123456, 107.123456"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSaving}
                />
                {validation ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        tone === 'success' ? '#15803d' : tone === 'danger' ? '#b91c1c' : colors.mutedForeground,
                    }}
                  >
                    {validation.message}
                  </Text>
                ) : null}
              </View>

              {localError || errorMessage ? (
                <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13 }}>
                  {localError || errorMessage}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <NeoButton
                  label={isSaving ? 'Menyimpan...' : 'Simpan koordinat'}
                  variant="secondary"
                  onPress={() => {
                    const trimmed = koordinat.trim()
                    if (!canSave) {
                      setLocalError('Isi koordinat valid di desa pekerjaan dulu.')
                      return
                    }
                    setLocalError(null)
                    onSave(trimmed)
                  }}
                  disabled={!canSave || isSaving}
                />
                <NeoButton label="Batal" variant="ghost" onPress={onClose} disabled={isSaving} />
              </View>
            </ScrollView>
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
