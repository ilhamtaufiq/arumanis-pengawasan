import { describe, expect, test } from 'bun:test'
import {
  buildKegiatanCaption,
  draftToStoryMeta,
  extractKegiatanContext,
  type KegiatanLapanganDraft,
} from '../apps/mobile/lib/kegiatan-lapangan'
import type { PekerjaanDetail } from '@pengawas/shared'

describe('buildKegiatanCaption', () => {
  test('includes nama kegiatan, keterangan, and @bidang_ams without IG prefix', () => {
    const caption = buildKegiatanCaption({
      namaKegiatan: 'Monitoring dan Evaluasi',
      namaPaket: 'Paket Air Desa X',
      desa: 'Ciranjang',
      kecamatan: 'Ciranjang',
      outputLine: 'SR, IPA',
      outcomeLine: 'Penyediaan Air Minum · Sub A',
      pengawas: 'Budi',
      koordinat: '-6.8,107.1',
      tahunAnggaran: 2026,
      keterangan: 'Cek keran komunal',
    })

    expect(caption.startsWith('Monitoring dan Evaluasi')).toBe(true)
    expect(caption).toContain('Paket: Paket Air Desa X')
    expect(caption).toContain('Ciranjang')
    expect(caption).toContain('Output: SR, IPA')
    expect(caption).toContain('Outcome: Penyediaan Air Minum')
    expect(caption).toContain('Keterangan: Cek keran komunal')
    expect(caption).toContain('Pengawas: Budi')
    expect(caption).toContain('@bidang_ams')
    expect(caption).not.toContain('IG @bidang_ams')
    expect(caption).toContain('TA 2026')
  })
})

describe('extractKegiatanContext', () => {
  test('maps detail pekerjaan to context with volume', () => {
    const detail = {
      id: 9,
      nama_paket: 'Paket Y',
      desa: { id: 1, nama_desa: 'Desa A' },
      kecamatan: { id: 2, nama_kecamatan: 'Kec B' },
      output: [
        { id: 1, komponen: 'SR', volume: 10, satuan: 'unit' },
        { id: 2, komponen: 'IPA', volume: 5, satuan: 'unit' },
      ],
      kegiatan: {
        id: 3,
        nama_kegiatan: 'Air Minum',
        nama_sub_kegiatan: 'SPAM',
        tahun_anggaran: 2026,
      },
      pengawas: { id: 4, nama: 'Siti' },
    } as PekerjaanDetail

    const ctx = extractKegiatanContext(detail)
    expect(ctx.pekerjaanId).toBe(9)
    expect(ctx.outputLine).toBe('SR 10 unit · IPA 5 unit')
    expect(ctx.outcomeLine).toContain('Air Minum')
    expect(ctx.pengawas).toBe('Siti')
    expect(ctx.tahunAnggaran).toBe(2026)
  })
})

describe('draftToStoryMeta', () => {
  test('uses dynamic nama kegiatan as title/badge and AMS theme', () => {
    const draft: KegiatanLapanganDraft = {
      id: 'kl-1',
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-01T10:00:00Z',
      photoUri: 'file://x.jpg',
      namaKegiatan: 'Provisional Hand Over',
      keterangan: 'Siap serah terima',
      pekerjaanId: 1,
      namaPaket: 'Paket Z',
      desa: 'Desa',
      kecamatan: 'Kec',
      outputLine: 'SR',
      outcomeLine: 'Outcome A',
      pengawas: 'Ani',
      tahunAnggaran: 2026,
      koordinat: '-6,107',
      caption: 'x',
    }
    const meta = draftToStoryMeta(draft)
    expect(meta.title).toBe('Provisional Hand Over')
    expect(meta.subtitle).toBe('Paket Z')
    expect(meta.badge).toBe('PROVISIONAL HAND OVER')
    expect(meta.theme).toBe('ams')
    expect(meta.outputLine).toBe('SR')
    expect(meta.slotLine).toBe('Outcome A')
    expect(meta.penerimaLine).toBe('Siap serah terima')
    expect(meta.penerimaLabel).toBe('KETERANGAN')
    expect(meta.brandLine).toContain('TA 2026')
  })
})
