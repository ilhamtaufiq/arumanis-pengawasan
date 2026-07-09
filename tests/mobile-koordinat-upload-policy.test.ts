import { describe, expect, test } from 'bun:test'
import {
  buildKoordinatValidationApiFailure,
  buildKoordinatValidationFromApi,
  canUploadFotoWithKoordinat,
  koordinatValidationTone,
} from '../apps/mobile/lib/koordinat-upload-policy'

describe('mobile koordinat upload policy', () => {
  test('allows upload when coordinates are outside desa with warning', () => {
    const validation = buildKoordinatValidationFromApi({
      validasi_koordinat: false,
      validasi_koordinat_message: 'Koordinat di luar Desa Babakancaringin, Kec. Karangtengah.',
    })

    expect(validation.allowUpload).toBe(true)
    expect(koordinatValidationTone(validation)).toBe('warning')
    expect(
      canUploadFotoWithKoordinat({
        hasAsset: true,
        koordinat: '-6.800000, 107.210000',
        isUploading: false,
        isLocating: false,
        validation,
      }),
    ).toBe(true)
  })

  test('allows upload when validation API fails', () => {
    const validation = buildKoordinatValidationApiFailure()

    expect(
      canUploadFotoWithKoordinat({
        hasAsset: true,
        koordinat: '-6.800000, 107.210000',
        isUploading: false,
        isLocating: false,
        validation,
      }),
    ).toBe(true)
  })

  test('blocks upload while validation is loading', () => {
    expect(
      canUploadFotoWithKoordinat({
        hasAsset: true,
        koordinat: '-6.800000, 107.210000',
        isUploading: false,
        isLocating: false,
        validation: {
          valid: false,
          message: 'Memvalidasi koordinat...',
          loading: true,
          allowUpload: false,
        },
      }),
    ).toBe(false)
  })
})