import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { hasParsableKoordinat, isManualOrEmptyKoordinat } from '@pengawas/shared/koordinat'
import { validateKoordinat } from '@/lib/api'
import { resolveDeviceKoordinat } from '@/lib/device-location'
import { useIsOnline } from '@/hooks/useIsOnline'
import type { PickedImageAsset } from '@/lib/foto-upload-meta'
import { extractCoordinatesFromAsset } from '@/lib/image-gps'
import { NeoButton, NeoInput, NeoSurface } from '@/components/ui'
import { colors } from '@/theme/tokens'

type UploadTarget = {
  output: { id: number; komponen: string; volume?: string | number | null; satuan?: string | null }
  slot: string
  penerima?: { id: number; nama: string }
}

type KoordinatValidationState = {
  valid: boolean
  message: string
  loading: boolean
}

type FotoUploadModalProps = {
  visible: boolean
  target: UploadTarget | null
  asset: PickedImageAsset | null
  pekerjaanId: number
  onClose: () => void
  onUpload: (koordinat: string) => void
  isUploading?: boolean
}

export function FotoUploadModal({
  visible,
  target,
  asset,
  pekerjaanId,
  onClose,
  onUpload,
  isUploading = false,
}: FotoUploadModalProps) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const sheetWidth = Math.min(560, width)
  const sheetMaxHeight = Math.min(height * 0.92, height - insets.top - 8)

  const [koordinat, setKoordinat] = useState('')
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [validation, setValidation] = useState<KoordinatValidationState | null>(null)
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
      setExtractionStatus('Mencari koordinat dari foto...')
      const fromPhoto = await extractCoordinatesFromAsset(asset!)
      if (cancelled) return

      if (fromPhoto) {
        setKoordinat(fromPhoto)
        setExtractionStatus('Koordinat berhasil diekstrak dari foto.')
        return
      }

      setExtractionStatus(
        isOnline ? 'Mengambil lokasi GPS perangkat...' : 'Mengambil lokasi via jaringan seluler...',
      )
      setIsLocating(true)
      try {
        const fromDevice = await resolveDeviceKoordinat()
        if (cancelled) return
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
      setValidation({
        valid: true,
        message: 'Offline — validasi server ditunda. Koordinat siap dipakai untuk antrean upload.',
        loading: false,
      })
      return
    }

    let cancelled = false
    setValidation({ valid: false, message: 'Memvalidasi koordinat...', loading: true })

    const timer = setTimeout(() => {
      void validateKoordinat(pekerjaanId, koordinat.trim())
        .then((result) => {
          if (cancelled) return
          setValidation({
            valid: Boolean(result.validasi_koordinat),
            message: result.validasi_koordinat_message || 'Validasi selesai.',
            loading: false,
          })
        })
        .catch(() => {
          if (cancelled) return
          setValidation({
            valid: false,
            message: 'Gagal memvalidasi koordinat.',
            loading: false,
          })
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [visible, koordinat, pekerjaanId, isOnline])

  const canUpload =
    Boolean(asset) &&
    hasParsableKoordinat(koordinat) &&
    validation?.loading === false &&
    validation?.valid === true &&
    !isUploading &&
    !isLocating

  async function handleDeviceLocation() {
    setLocalError(null)
    setIsLocating(true)
    setExtractionStatus('Mendapatkan lokasi dari perangkat...')

    try {
      const result = await resolveDeviceKoordinat()
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
    const trimmed = koordinat.trim()
    if (!hasParsableKoordinat(trimmed)) {
      setLocalError('Koordinat wajib diisi dengan format lat, lng.')
      return
    }
    if (!validation?.valid) {
      setLocalError(validation?.message || 'Koordinat belum valid untuk pekerjaan ini.')
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
                  placeholder="Menunggu GPS..."
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
                      color: validation.loading ? colors.mutedForeground : validation.valid ? colors.accent : colors.danger,
                    }}
                  >
                    {validation.message}
                  </Text>
                ) : null}
                {localError ? (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger, lineHeight: 18 }}>{localError}</Text>
                ) : null}
              </NeoSurface>

              <View style={{ gap: 10 }}>
                <NeoButton
                  label={isUploading ? 'Mengunggah...' : 'Unggah foto'}
                  onPress={handleUpload}
                  disabled={!canUpload}
                />
                <NeoButton label="Batal" variant="neutral" onPress={onClose} disabled={isUploading} />
                {!canUpload && !isUploading && !isLocating ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>
                    Tunggu koordinat valid sebelum unggah.
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