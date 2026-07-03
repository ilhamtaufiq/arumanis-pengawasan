import { describe, expect, test } from 'bun:test'
import {
  buildKontrakAddendumFormData,
  getAddendumMissingAttachmentLabels,
  getMissingAttachmentLabels,
  isAddendumIncomplete,
} from '../src/lib/kontrak-addendum'

describe('kontrak addendum helpers', () => {
  test('buildKontrakAddendumFormData appends payload and typed attachments', () => {
    const file = new File(['pdf'], 'surat.pdf', { type: 'application/pdf' })
    const formData = buildKontrakAddendumFormData(
      {
        addendum_ke: 2,
        tanggal_addendum: '2026-06-27',
        jenis_addendum: 'waktu',
        alasan: 'Perpanjangan waktu',
        nilai_kontrak_sebelum: 1000000,
        nilai_kontrak_sesudah: 1000000,
        tgl_selesai_sebelum: '2026-12-31',
        tgl_selesai_sesudah: '2027-03-31',
      },
      {
        surat_permohonan: file,
      },
    )

    expect(formData.get('addendum_ke')).toBe('2')
    expect(formData.get('jenis_addendum')).toBe('waktu')
    expect(formData.get('attachments[surat_permohonan]')).toBeInstanceOf(File)
  })

  test('getMissingAttachmentLabels lists required documents that are not uploaded', () => {
    const missing = getMissingAttachmentLabels({
      surat_permohonan: new File(['a'], 'a.pdf'),
      cco: new File(['b'], 'b.xlsx'),
    })

    expect(missing).toContain('Surat Undangan Pembahasan')
    expect(missing).not.toContain('Surat Permohonan')
    expect(missing).not.toContain('CCO')
    expect(missing.length).toBe(6)
  })

  test('getAddendumMissingAttachmentLabels detects missing uploaded documents on draft addendum', () => {
    const missing = getAddendumMissingAttachmentLabels({
      id: 1,
      kontrak_id: 1,
      addendum_ke: 1,
      nomor_addendum: null,
      tanggal_addendum: '2026-06-27',
      jenis_addendum: 'waktu',
      alasan: null,
      deskripsi_perubahan: null,
      nilai_kontrak_sebelum: null,
      nilai_kontrak_sesudah: null,
      tgl_selesai_sebelum: null,
      tgl_selesai_sesudah: null,
      status: 'draft',
      attachments: [
        {
          id: 10,
          name: 'surat.pdf',
          url: 'https://example.com/surat.pdf',
          type: 'application/pdf',
          document_type: 'surat_permohonan',
          label: 'Surat Permohonan',
          size: 100,
        },
      ],
    })

    expect(missing).toContain('Surat Undangan Pembahasan')
    expect(missing).not.toContain('Surat Permohonan')
    expect(isAddendumIncomplete({
      id: 1,
      kontrak_id: 1,
      addendum_ke: 1,
      nomor_addendum: null,
      tanggal_addendum: '2026-06-27',
      jenis_addendum: 'waktu',
      alasan: null,
      deskripsi_perubahan: null,
      nilai_kontrak_sebelum: null,
      nilai_kontrak_sesudah: null,
      tgl_selesai_sebelum: null,
      tgl_selesai_sesudah: null,
      status: 'disetujui',
      attachments: [],
    })).toBe(false)
  })
})