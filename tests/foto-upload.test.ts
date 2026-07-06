import { describe, expect, it } from 'bun:test'
import { normalizeFotoFileMeta } from '../apps/mobile/lib/foto-upload-meta'

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

  it('rewrites unsupported extension to jpg', () => {
    const result = normalizeFotoFileMeta({
      uri: 'blob:test',
      mimeType: 'image/webp',
      fileName: 'photo.webp',
    })

    expect(result.fileName).toBe('photo.jpg')
    expect(result.mimeType).toBe('image/jpeg')
  })
})