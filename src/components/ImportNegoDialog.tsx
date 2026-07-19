import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { importNegoFromFile, type NegoImportResult } from '@/lib/nego-import'
import type { ProgressItem } from '@/lib/types'

type ImportNegoDialogProps = {
  open: boolean
  onClose: () => void
  hasExistingItems: boolean
  onImport: (items: ProgressItem[], meta: NegoImportResult) => void
  onError?: (message: string) => void
}

export function ImportNegoDialog({
  open,
  onClose,
  hasExistingItems,
  onImport,
  onError,
}: ImportNegoDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<NegoImportResult | null>(null)

  if (!open) return null

  async function handleFile(file: File | undefined) {
    if (!file) return
    setLoading(true)
    setPending(null)
    try {
      const result = await importNegoFromFile(file)
      if (hasExistingItems) {
        setPending(result)
      } else {
        onImport(result.items, result)
        onClose()
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Gagal mengimpor file Hasil Nego.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function confirmReplace() {
    if (!pending) return
    onImport(pending.items, pending)
    setPending(null)
    onClose()
  }

  const fmt = (n: number) =>
    `Rp${Math.round(n).toLocaleString('id-ID')}`

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-shell import-nego-modal-shell">
        <div className="modal-header">
          <div>
            <h2>
              <Upload className="inline-icon" size={18} /> Import Nego
            </h2>
            <p className="modal-subtitle">
              Unggah Excel <strong>Hasil Nego</strong> (sheet Nego) atau PDF lampiran BA
              klarifikasi/negosiasi. Harga dipakai = kolom <strong>Negosiasi</strong>.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="import-nego-body">
          <div className="import-nego-dropzone">
            <FileSpreadsheet size={28} />
            <p className="import-nego-dropzone-title">Pilih file Hasil Nego</p>
            <p className="import-nego-dropzone-hint">
              Excel (.xlsx) · PDF BA negosiasi (berteks, bukan scan polos)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,application/pdf"
              disabled={loading}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>

          {loading ? <p className="import-nego-status">Membaca file…</p> : null}

          {pending ? (
            <div className="import-nego-confirm">
              <p>
                Ada <strong>{pending.itemCount}</strong> item dari{' '}
                {pending.source === 'pdf' ? 'PDF' : 'Excel'}. Item laporan saat ini akan{' '}
                <strong>diganti</strong>.
              </p>
              <ul>
                <li>DPP (volume × harga): {fmt(pending.subtotalDpp)}</li>
                <li>Total + PPN 11%: {fmt(pending.grandTotal)}</li>
                {pending.pdfGrandTotal != null ? (
                  <li>TOTAL NILAI NEGOSIASI (PDF): {fmt(pending.pdfGrandTotal)}</li>
                ) : null}
              </ul>
              <div className="modal-actions">
                <Button type="button" variant="neutral" onClick={() => setPending(null)}>
                  Batal
                </Button>
                <Button type="button" variant="primary" onClick={confirmReplace}>
                  Ya, ganti &amp; import
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-actions">
          <Button type="button" variant="neutral" onClick={onClose} disabled={loading}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
