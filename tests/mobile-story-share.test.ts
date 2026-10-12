import { describe, expect, test } from 'bun:test'
import { buildStoryShareMeta } from '../apps/mobile/lib/story-share-meta'
import type { Foto } from '@pengawas/shared'

const foto: Foto = {
  id: 1,
  keterangan: '50%|Unit 1',
  koordinat: '-6.8,107.1',
  komponen: { komponen: 'SR' },
  penerima: { nama: 'Warga A' },
  created_at: '2026-03-01T10:00:00Z',
}

describe('buildStoryShareMeta', () => {
  test('includes pekerjaan location and brand year', () => {
    const meta = buildStoryShareMeta(foto, {
      namaPaket: 'Paket Air Minum Desa X',
      desa: 'Ciranjang',
      kecamatan: 'Ciranjang',
      tahunAnggaran: 2026,
    })

    expect(meta.title).toBe('Paket Air Minum Desa X')
    expect(meta.locationLine).toContain('Ciranjang')
    expect(meta.outputLine).toBe('SR')
    expect(meta.slotLine).toBe('50%')
    // Penerima dan catatan tampil di baris keterangan, bukan di penerimaLine.
    expect(meta.penerimaLine).toBeNull()
    expect(meta.keteranganLine).toBe('Warga A · Unit 1')
    expect(meta.koordinatLine).toBe('-6.8,107.1')
    expect(meta.brandLine).toContain('TA 2026')
    expect(meta.badge).toBe('SLOT 50%')
  })

  test('falls back when location empty', () => {
    const meta = buildStoryShareMeta(
      { id: 2, keterangan: '0%' },
      { namaPaket: 'Paket Y' },
    )
    expect(meta.locationLine).toBe('Lokasi belum diisi')
    expect(meta.slotLine).toBe('0%')
    expect(meta.penerimaLine).toBeNull()
  })
})
