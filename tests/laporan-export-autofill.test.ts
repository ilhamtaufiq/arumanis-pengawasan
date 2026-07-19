import { describe, expect, it } from 'bun:test'
import {
  buildExportAutofill,
  buildLaporanFileName,
  mapProgressReportForExport,
} from '../src/lib/laporan-export'
import type { ProgressReportView } from '../src/lib/types'

describe('laporan export autofill', () => {
  const view: ProgressReportView = {
    pekerjaan: {
      id: 1,
      nama: 'SPAM Desa Contoh',
      pagu: 1000000,
      desa_nama: 'Contoh',
      kecamatan_nama: 'Cianjur',
    },
    kegiatan: {
      nama_kegiatan: 'Air Minum',
      nama_sub_kegiatan: 'SPAM',
      sumber_dana: 'APBD',
      tahun_anggaran: 2026,
      nama_pptk: 'Budi PPTK',
      nip_pptk: '123',
    },
    kontrak: {
      tgl_spmk: '2026-01-01',
      tgl_spk: '2025-12-20',
      tgl_selesai: '2026-03-31',
      spk: 'SPK/1',
      spmk: 'SPMK/1',
      nilai_kontrak: 900000,
    },
    penyedia: { nama: 'CV Mitra', direktur: 'Andi' },
    pengawas: { nama: 'Siti Pengawas', nip: '999', jabatan: 'Pengawas Lapangan' },
    items: [
      {
        nama_item: 'Persiapan',
        rincian_item: 'Mobilisasi',
        satuan: 'ls',
        target_volume: 1,
        harga_satuan: 100000,
        bobot: 10,
        weekly_data: {
          '1': { rencana: 1, realisasi: 0.5 },
        },
      },
    ],
    totals: { total_bobot: 10, total_accumulated_real: 0.5, total_weighted_progress: 5 },
    max_minggu: 4,
  }

  it('maps progress view for export generators', () => {
    const report = mapProgressReportForExport(view)
    expect(report).not.toBeNull()
    expect(report?.pekerjaan.nama).toContain('SPAM')
    expect(report?.items[0]?.weekly_data[1]?.rencana).toBe(1)
    expect(report?.pengawas?.nama).toBe('Siti Pengawas')
    expect(report?.kegiatan?.nama_pptk).toBe('Budi PPTK')
  })

  it('autofills pejabat from report + settings', () => {
    const report = mapProgressReportForExport(view)
    const filled = buildExportAutofill(
      report,
      [
        { key: 'kontrak_nomor_dpa', value: 'DPA/001' },
        { key: 'kontrak_tanggal_dpa', value: '2026-01-15' },
      ],
      {},
      { weekNumber: 1 },
    )
    expect(filled.signatureData.namaMengetahui).toBe('Budi PPTK')
    expect(filled.signatureData.namaDiperiksa).toBe('Siti Pengawas')
    expect(filled.signatureData.namaPerusahaan).toBe('CV Mitra')
    expect(filled.dpaData.nomorDpa).toBe('DPA/001')
    // Lokasi tanda tangan = Cianjur (bukan desa pekerjaan)
    expect(filled.signatureData.lokasi).toBe('Cianjur')
    // SPMK 2026-01-01 minggu 1 → akhir minggu 7 Januari 2026
    expect(filled.signatureData.tanggal).toMatch(/7\s+Januari\s+2026/)
    expect(filled.signatureData.tanggal).not.toMatch(/–/)
    expect(filled.sources.tanggalLaporan).toContain('Akhir minggu')
  })

  it('builds laporan file name', () => {
    const name = buildLaporanFileName('SPAM Desa Contoh', 'M1', 'pdf', new Date('2026-07-19'))
    expect(name).toMatch(/^Laporan_Mingguan_.*_M1_2026-07-19\.pdf$/)
  })
})
