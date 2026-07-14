import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { hasParsableKoordinat, isManualOrEmptyKoordinat } from '@pengawas/shared/koordinat'
import { validateKoordinat } from '@/lib/api'
import { resolvePhotoUploadKoordinat } from '@/lib/device-location'
import { useIsOnline } from '@/hooks/useIsOnline'
import type { PickedImageAsset } from '@/lib/foto-upload-meta'
import {
  extractDeepCoordinatesFromAsset,
  getQuickCoordinatesFromAsset,
} from '@/lib/image-gps'
import { NeoButton, NeoInput, NeoSurface } from '@/components/ui'
import {
  buildKoordinatValidationApiFailure,
  buildKoordinatValidationFromApi,
  buildKoordinatValidationOffline,
  canUploadFotoWithKoordinat,
  koordinatValidationTone,
  type KoordinatValidationUi,
} from '@/lib/koordinat-upload-policy'
import { colors } from '@/theme/tokens'

type UploadTarget = {
  output: { id: number; komponen: string; volume?: string | number | null; satuan?: string | null }
  slot: string
  penerima?: { id: number; nama: string }
}

type FotoUploadModalProps = {
  visible: boolean
  target: UploadTarget | null
  asset: PickedImageAsset | null
  pekerjaanId: number
  onClose: () => void
  onUpload: (koordinat: string) => void
  isUploading?: boolean
  /** Progress upload 0–100 (opsional). */
  uploadProgress?: number | null
}

export function FotoUploadModal({
  visible,
  target,
  asset,
  pekerjaanId,
  onClose,
  onUpload,
  isUploading = false,
  uploadProgress = null,
}: FotoUploadModalProps) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const sheetWidth = Math.min(560, width)
  const sheetMaxHeight = Math.min(height * 0.92, height - insets.top - 8)

  const [koordinat, setKoordinat] = useState('')
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [validation, setValidation] = useState<KoordinatValidationUi | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const isOnline = useIsOnline()

  useEffect(() => {
    if (!visible) {
      setKoordinat('')
      setExtractionStatus(null)
      setValidation(null)
      setLocalError(null)
      setIsLocating(false)
      return
    }

    if (!asset) {
      return
    }

    let cancelled = false

    async function resolveKoordinat() {
      const quick = getQuickCoordinatesFromAsset(asset!)
      if (quick) {
        setKoordinat(quick)
        setExtractionStatus('Koordinat berhasil diekstrak dari foto.')
        return
      }

      setExtractionStatus(
        isOnline ? 'Mengambil lokasi GPS perangkat...' : 'Mengambil lokasi via jaringan seluler...',
      )
      setIsLocating(true)

      const devicePromise = resolvePhotoUploadKoordinat()
      const deepExifPromise = extractDeepCoordinatesFromAsset(asset!)

      try {
        const winner = await Promise.race([
          devicePromise.then((result) => ({ kind: 'device' as const, result })),
          deepExifPromise.then((result) => ({ kind: 'exif' as const, result })),
        ])

        if (cancelled) return

        if (winner.kind === 'exif' && winner.result) {
          setKoordinat(winner.result)
          setExtractionStatus('Koordinat berhasil diekstrak dari foto.')
          return
        }

        if (winner.kind === 'device') {
          setKoordinat(winner.result.koordinat)
          setExtractionStatus(winner.result.message)
          return
        }

        const [fromDevice, fromExif] = await Promise.all([devicePromise, deepExifPromise])
        if (cancelled) return

        if (fromExif) {
          setKoordinat(fromExif)
          setExtractionStatus('Koordinat berhasil diekstrak dari foto.')
          return
        }

        setKoordinat(fromDevice.koordinat)
        setExtractionStatus(fromDevice.message)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Gagal mendapatkan lokasi perangkat.'
        setExtractionStatus('Koordinat tidak ditemukan pada foto. Isi manual atau ketuk Lokasi perangkat.')
        setLocalError(message)
      } finally {
        if (!cancelled) {
          setIsLocating(false)
        }
      }
    }

    void resolveKoordinat()

    return () => {
      cancelled = true
    }
  }, [visible, asset, isOnline])

  useEffect(() => {
    if (!visible || isManualOrEmptyKoordinat(koordinat) || !hasParsableKoordinat(koordinat)) {
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
      void validateKoordinat(pekerjaanId, koordinat.trim())
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
  }, [visible, koordinat, pekerjaanId, isOnline])

  const canUpload = canUploadFotoWithKoordinat({
    hasAsset: Boolean(asset),
    koordinat,
    isUploading,
    isLocating,
    validation,
  })

  const validationTone = koordinatValidationTone(validation)
  const validationColor =
    validationTone === 'success'
      ? colors.accent
      : validationTone === 'warning'
        ? colors.foreground
        : validationTone === 'danger'
          ? colors.danger
          : colors.mutedForeground

  async function handleDeviceLocation() {
    setLocalError(null)
    setIsLocating(true)
    setExtractionStatus('Mendapatkan lokasi dari perangkat...')

    try {
      const result = await resolvePhotoUploadKoordinat()
      setKoordinat(result.koordinat)
      setExtractionStatus(result.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mendapatkan lokasi.'
      setLocalError(message)
      setExtractionStatus(null)
    } finally {
      setIsLocating(false)
    }
  }

  function handleUpload() {
    if (isUploading) return
    const trimmed = koordinat.trim()
    if (!hasParsableKoordinat(trimmed)) {
      setLocalError('Koordinat wajib diisi dengan format lat, lng.')
      return
    }
    if (!canUpload) {
      setLocalError(validation?.message || 'Tunggu validasi koordinat selesai.')
      return
    }
    setLocalError(null)
    onUpload(trimmed)
  }

  if (!target || !asset) {
    return null
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
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
          <NeoSurface shadow="lg" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 14 }}>
            <ScrollView
              contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>UPLOAD FOTO</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{target.output.komponen}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  Slot {target.slot}
                  {target.penerima ? ` · ${target.penerima.nama}` : ''}
                </Text>
              </View>

              <View
                style={{
                  width: '100%',
                  height: 200,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: colors.muted,
                }}
              >
                <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>

              <NeoSurface tone="card" style={{ gap: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }}>Koordinat GPS (wajib)</Text>
                <NeoInput
                  label="Koordinat"
                  placeholder={isLocating ? 'Mengambil GPS...' : 'lat, lng'}
                  value={koordinat}
                  onChangeText={setKoordinat}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <NeoButton
                  label={isLocating ? 'Mengambil lokasi...' : 'Perbarui lokasi perangkat'}
                  variant="neutral"
                  onPress={() => void handleDeviceLocation()}
                  disabled={isUploading || isLocating}
                />
                {extractionStatus ? (
                  <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>{extractionStatus}</Text>
                ) : null}
                {validation ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      lineHeight: 18,
                      color: validationColor,
                    }}
                  >
                    {validation.message}
                  </Text>
                ) : null}
                {validation && !validation.loading && !validation.valid && validation.allowUpload ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>
                    Foto tetap bisa diunggah. Status koordinat disimpan sebagai catatan di server.
                  </Text>
                ) : null}
                {localError ? (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger, lineHeight: 18 }}>{localError}</Text>
                ) : null}
              </NeoSurface>

              <View style={{ gap: 10 }}>
                {isUploading ? (
                  <View style={{ gap: 6 }}>
                    <View
                      style={{
                        height: 10,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 6,
                        backgroundColor: colors.muted,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${uploadProgress != null ? Math.max(4, uploadProgress) : 30}%`,
                          backgroundColor: colors.main,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, textAlign: 'center' }}>
                      {uploadProgress != null ? `Mengunggah... ${uploadProgress}%` : 'Mengunggah...'}
                    </Text>
                  </View>
                ) : null}
                <NeoButton
                  label={
                    isUploading
                      ? uploadProgress != null
                        ? `Mengunggah... ${uploadProgress}%`
                        : 'Mengunggah...'
                      : 'Unggah foto'
                  }
                  onPress={handleUpload}
                  disabled={!canUpload}
                />
                <NeoButton label="Batal" variant="neutral" onPress={onClose} disabled={isUploading} />
                {!canUpload && !isUploading && !isLocating ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>
                    {validation?.loading
                      ? 'Memvalidasi koordinat...'
                      : !hasParsableKoordinat(koordinat)
                        ? 'Isi koordinat GPS terlebih dahulu.'
                        : 'Tunggu validasi koordinat selesai.'}
                  </Text>
                ) : null}
              </View>
            </ScrollView>
          </NeoSurface>
        </View>
      </View>
    </Modal>
  )
}