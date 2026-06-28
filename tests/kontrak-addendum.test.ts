import { describe, expect, test } from 'bun:test'
import { buildKontrakAddendumFormData, getMissingAttachmentLabels } from '../src/lib/kontrak-addendum'

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
})