import { describe, expect, it } from 'bun:test'
import {
  getUnsupportedFotoFormatReason,
  normalizeFotoFileMeta,
} from '../apps/mobile/lib/foto-upload-meta'

describe('normalizeFotoFileMeta', () => {
  it('defaults to jpeg when mime type is missing', () => {
    expect(normalizeFotoFileMeta({ uri: 'blob:test' })).toEqual({
      fileName: expect.stringMatching(/^foto-\d+\.jpg$/),
      mimeType: 'image/jpeg',
    })
  })

  it('keeps png extension and mime type', () => {
    expect(
      normalizeFotoFileMeta({
        uri: 'blob:test',
        mimeType: 'image/png',
        fileName: 'dokumentasi.png',
      }),
    ).toEqual({
      fileName: 'dokumentasi.png',
      mimeType: 'image/png',
    })
  })

  it('rewrites odd extensions to jpg when mime is jpeg-compatible', () => {
    const result = normalizeFotoFileMeta({
      uri: 'blob:test',
      mimeType: 'image/jpeg',
      fileName: 'photo.bin',
    })

    expect(result.fileName).toBe('photo.jpg')
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('rejects HEIC/WebP instead of renaming (server only accepts jpg/png)', () => {
    expect(() =>
      normalizeFotoFileMeta({
        uri: 'file:///photo.heic',
        mimeType: 'image/heic',
        fileName: 'photo.heic',
      }),
    ).toThrow(/HEIC/i)

    expect(() =>
      normalizeFotoFileMeta({
        uri: 'blob:test',
        mimeType: 'image/webp',
        fileName: 'photo.webp',
      }),
    ).toThrow(/WEBP/i)
  })
})

describe('getUnsupportedFotoFormatReason', () => {
  it('detects heic from mime or filename', () => {
    expect(getUnsupportedFotoFormatReason({ mimeType: 'image/heic' })).toMatch(/HEIC/i)
    expect(getUnsupportedFotoFormatReason({ fileName: 'a.HEIF' })).toMatch(/HEIF/i)
    expect(getUnsupportedFotoFormatReason({ mimeType: 'image/jpeg', fileName: 'ok.jpg' })).toBeNull()
  })
})
