import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { hasParsableKoordinat, isManualOrEmptyKoordinat } from '@pengawas/shared/koordinat'
import { validateKoordinat } from '@/lib/api'
import { getDeviceKoordinat } from '@/lib/device-location'
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
  const [koordinat, setKoordinat] = useState('')
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [validation, setValidation] = useState<KoordinatValidationState | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
    setExtractionStatus('Mencoba mengekstrak koordinat dari foto...')

    void extractCoordinatesFromAsset(asset)
      .then((coords) => {
        if (cancelled) return
        if (coords) {
          setKoordinat(coords)
          setExtractionStatus('Koordinat berhasil diekstrak dari foto.')
          return
        }
        setExtractionStatus('Tidak ada koordinat pada foto. Isi manual atau gunakan lokasi perangkat.')
      })
      .catch(() => {
        if (cancelled) return
        setExtractionStatus('Gagal mengekstrak koordinat dari foto.')
      })

    return () => {
      cancelled = true
    }
  }, [visible, asset])

  useEffect(() => {
    if (!visible || isManualOrEmptyKoordinat(koordinat) || !hasParsableKoordinat(koordinat)) {
      setValidation(null)
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
  }, [visible, koordinat, pekerjaanId])

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
      const coords = await getDeviceKoordinat()
      setKoordinat(coords)
      setExtractionStatus('Lokasi berhasil didapatkan dari perangkat.')
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
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 17, 17, 0.72)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '92%' }}>
          <NeoSurface shadow="lg" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 16 }}>
            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>UPLOAD FOTO</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{target.output.komponen}</Text>
                <Text style={{ color: colors.mutedForeground }}>
                  Slot {target.slot}
                  {target.penerima ? ` · ${target.penerima.nama}` : ''}
                </Text>
              </View>

              <View
                style={{
                  width: '100%',
                  height: 180,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: colors.muted,
                }}
              >
                <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>

              <NeoSurface tone="secondary" style={{ gap: 10 }}>
                <Text style={{ fontWeight: '800', fontSize: 14 }}>Koordinat GPS (wajib)</Text>
                <NeoInput
                  label="Koordinat"
                  placeholder="-6.123456, 106.123456"
                  value={koordinat}
                  onChangeText={setKoordinat}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <NeoButton
                  label={isLocating ? 'Mengambil lokasi...' : 'Lokasi perangkat'}
                  variant="neutral"
                  onPress={() => void handleDeviceLocation()}
                  disabled={isUploading || isLocating}
                />
                {extractionStatus ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{extractionStatus}</Text>
                ) : null}
                {validation ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: validation.loading ? colors.mutedForeground : validation.valid ? colors.accent : colors.secondary,
                    }}
                  >
                    {validation.message}
                  </Text>
                ) : null}
                {localError ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>{localError}</Text> : null}
              </NeoSurface>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <NeoButton
                    label={isUploading ? 'Mengunggah...' : 'Unggah foto'}
                    onPress={handleUpload}
                    disabled={!canUpload}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <NeoButton label="Batal" variant="neutral" onPress={onClose} disabled={isUploading} />
                </View>
              </View>
            </ScrollView>
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}