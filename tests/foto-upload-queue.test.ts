import { describe, expect, test } from 'bun:test'
import { buildFotoFormDataFromQueue, createQueueId, type QueuedFotoUpload } from '@/lib/foto-upload-queue'

describe('foto-upload-queue helpers', () => {
  test('createQueueId returns non-empty string', () => {
    expect(createQueueId().length).toBeGreaterThan(8)
  })

  test('buildFotoFormDataFromQueue maps queued payload to FormData', () => {
    const blob = new Blob(['fake-image'], { type: 'image/jpeg' })
    const entry: QueuedFotoUpload = {
      id: 'test-id',
      pekerjaanId: 12,
      komponenId: 34,
      komponenLabel: 'Pipa distribusi',
      slot: '50%',
      penerimaId: 9,
      koordinat: '-6.8,107.1',
      fileName: 'lapangan.jpg',
      fileType: 'image/jpeg',
      fileBlob: blob,
      createdAt: '2026-06-29T10:00:00.000Z',
      attempts: 0,
    }

    const formData = buildFotoFormDataFromQueue(entry)

    expect(formData.get('pekerjaan_id')).toBe('12')
    expect(formData.get('komponen_id')).toBe('34')
    expect(formData.get('keterangan')).toBe('50%')
    expect(formData.get('penerima_id')).toBe('9')
    expect(formData.get('koordinat')).toBe('-6.8,107.1')
    expect(formData.get('file')).toBeInstanceOf(File)
  })
})