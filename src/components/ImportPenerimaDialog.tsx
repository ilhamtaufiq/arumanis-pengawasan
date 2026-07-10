import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, FileUp, Loader2, X } from 'lucide-react'
import { Badge, Button, FieldGroup, Input } from '@/components/ui'
import type { Output } from '@/lib/types'
import {
  FOTO_PROGRESS_LEVELS,
  countReadyFotoSlots,
  downloadAllPenerimaImportTemplates,
  downloadPenerimaImportTemplate,
  getPenerimaImportProfile,
  importPenerimaBatch,
  parsePenerimaExcelFile,
  revokeParsedRowPreviews,
  type ParsePenerimaExcelResult,
  type ParsedPenerimaRow,
} from '@/lib/penerima-import'

type FeedbackTone = 'success' | 'warning' | 'danger' | 'info'

type ImportPenerimaDialogProps = {
  open: boolean
  onClose: () => void
  pekerjaanId: number
  outputs: Output[]
  onSuccess: () => void
}

export function ImportPenerimaDialog({
  open,
  onClose,
  pekerjaanId,
  outputs,
  onSuccess,
}: ImportPenerimaDialogProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [parsedResult, setParsedResult] = useState<ParsePenerimaExcelResult | null>(null)
  const [importFoto, setImportFoto] = useState(true)
  const [komponenId, setKomponenId] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null)
  const parsedRowsRef = useRef<ParsedPenerimaRow[]>([])
  const excelInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  const selectedOutput = useMemo(
    () => outputs.find((output) => output.id.toString() === komponenId),
    [outputs, komponenId],
  )

  const selectedProfile = useMemo(
    () => (selectedOutput ? getPenerimaImportProfile(selectedOutput) : null),
    [selectedOutput],
  )

  const isKomunal = selectedProfile?.type === 'komunal'

  useEffect(() => {
    if (open) {
      return
    }

    revokeParsedRowPreviews(parsedRowsRef.current)
    parsedRowsRef.current = []
    setExcelFile(null)
    setZipFile(null)
    setParsedResult(null)
    setImportFoto(true)
    setKomponenId('')
    setParsing(false)
    setImporting(false)
    setProgressLabel('')
    setFeedback(null)
    if (excelInputRef.current) excelInputRef.current.value = ''
    if (zipInputRef.current) zipInputRef.current.value = ''
  }, [open])

  useEffect(() => {
    if (open && outputs.length === 1) {
      const only = outputs[0]
      if (only) setKomponenId(only.id.toString())
    }
  }, [open, outputs])

  const validRows = parsedResult?.rows.filter((row) => row.isValid) ?? []
  const readyFotoCount = parsedResult ? countReadyFotoSlots(validRows) : 0
  const canImportFoto = importFoto && readyFotoCount > 0
  const importProfile = parsedResult?.profile ?? selectedProfile

  const parseFiles = async (excel: File, zip: File | null, output?: Output) => {
    setParsing(true)
    setFeedback(null)
    try {
      const result = await parsePenerimaExcelFile(excel, zip, output)
      revokeParsedRowPreviews(parsedRowsRef.current)
      parsedRowsRef.current = result.rows
      setParsedResult(result)

      if (result.warnings.length > 0) {
        setFeedback({ tone: 'warning', message: result.warnings.join(' ') })
      } else {
        setFeedback({
          tone: 'success',
          message: `${result.rows.length} baris terbaca untuk ${result.profile?.komponen ?? 'komponen'}`,
        })
      }
    } catch (error) {
      console.error('Failed to parse penerima excel:', error)
      const message = error instanceof Error ? error.message : 'Gagal membaca file Excel'
      setFeedback({ tone: 'danger', message })
      setParsedResult(null)
      revokeParsedRowPreviews(parsedRowsRef.current)
      parsedRowsRef.current = []
    } finally {
      setParsing(false)
    }
  }

  const handleExcelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) {
      return
    }

    if (!selectedOutput) {
      setFeedback({ tone: 'danger', message: 'Pilih komponen output terlebih dahulu' })
      event.target.value = ''
      return
    }

    setExcelFile(selected)
    await parseFiles(selected, zipFile, selectedOutput)
  }

  const handleZipChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setZipFile(selected)

    if (excelFile && selectedOutput) {
      await parseFiles(excelFile, selected, selectedOutput)
    }
  }

  const handleKomponenChange = (value: string) => {
    setKomponenId(value)
    setParsedResult(null)
    revokeParsedRowPreviews(parsedRowsRef.current)
    parsedRowsRef.current = []
    setExcelFile(null)
    setZipFile(null)
    setFeedback(null)
    if (excelInputRef.current) excelInputRef.current.value = ''
    if (zipInputRef.current) zipInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!parsedResult || validRows.length === 0 || !importProfile) {
      setFeedback({ tone: 'danger', message: 'Tidak ada data valid untuk diimport' })
      return
    }

    if (importProfile.type === 'komunal' && !canImportFoto) {
      setFeedback({
        tone: 'danger',
        message: 'Komponen komunal membutuhkan koordinat dan foto untuk diimport',
      })
      return
    }

    setImporting(true)
    setFeedback(null)
    try {
      const result = await importPenerimaBatch({
        pekerjaanId,
        profile: importProfile,
        rows: parsedResult.rows,
        importFoto: canImportFoto,
        onProgress: (progress) => {
          const label =
            progress.phase === 'penerima'
              ? `Menyimpan penerima ${progress.current}/${progress.total}`
              : `Mengunggah foto ${progress.level ?? ''} ${progress.current}/${progress.total}`.trim()
          setProgressLabel(label)
        },
      })

      const summaryParts: string[] = []
      if (result.penerimaCreated > 0) {
        summaryParts.push(`${result.penerimaCreated} penerima`)
      }
      if (result.fotoCreated > 0) {
        summaryParts.push(`${result.fotoCreated} foto progress`)
      }

      if (result.errors.length > 0) {
        setFeedback({
          tone: summaryParts.length > 0 ? 'warning' : 'danger',
          message: [
            summaryParts.length > 0 ? `Import selesai: ${summaryParts.join(', ')}.` : 'Import gagal.',
            `Beberapa baris gagal: ${result.errors.slice(0, 3).join('; ')}`,
          ].join(' '),
        })
      } else if (summaryParts.length > 0) {
        setFeedback({ tone: 'success', message: `Import selesai: ${summaryParts.join(', ')}` })
      }

      if (result.penerimaCreated > 0 || result.fotoCreated > 0) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Failed to import penerima:', error)
      setFeedback({ tone: 'danger', message: 'Gagal mengimport data' })
    } finally {
      setImporting(false)
      setProgressLabel('')
    }
  }

  if (!open) return null

  const importButtonLabel = isKomunal
    ? `Import ${canImportFoto ? readyFotoCount : validRows.length} Unit/Foto`
    : `Import ${validRows.length} Penerima${canImportFoto ? ` + ${readyFotoCount} foto` : ''}`

  return (
    <div className="modal-backdrop" role="presentation" onClick={importing ? undefined : onClose}>
      <div
        className="modal-shell import-penerima-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-penerima-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="stack stack--dense">
            <strong id="import-penerima-title">Impor Excel per Komponen</strong>
            <span className="modal-subtitle">
              Pilih komponen output, unduh template yang sudah disesuaikan (volume &amp; tipe), lalu unggah
              kembali. Opsional: sertakan ZIP foto progress (0%–100%).
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={importing} aria-label="Tutup">
            <X size={16} />
          </Button>
        </div>

        <div className="import-penerima-body stack stack--compact">
          <div className="neo-surface import-penerima-section">
            <FieldGroup label="Komponen Output">
              <select
                className="neo-input"
                value={komponenId}
                onChange={(event) => handleKomponenChange(event.target.value)}
                disabled={outputs.length === 0 || importing}
              >
                <option value="">
                  {outputs.length === 0 ? 'Belum ada komponen output' : 'Pilih komponen'}
                </option>
                {outputs.map((output) => {
                  const profile = getPenerimaImportProfile(output)
                  return (
                    <option key={output.id} value={output.id.toString()}>
                      {output.komponen} ({output.volume} {output.satuan}) —{' '}
                      {profile.type === 'komunal' ? 'Komunal' : 'Per unit'}
                    </option>
                  )
                })}
              </select>
            </FieldGroup>

            {selectedProfile ? (
              <div className="badge-row-inline" style={{ marginTop: 8 }}>
                <Badge tone="info">Target: {selectedProfile.targetRows} baris</Badge>
                <Badge tone={isKomunal ? 'warning' : 'success'}>
                  {isKomunal ? 'Template komunal' : 'Template per penerima'}
                </Badge>
              </div>
            ) : null}

            <div className="detail-inline-controls" style={{ marginTop: 10 }}>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={!selectedOutput || importing}
                onClick={() => {
                  if (!selectedOutput) return
                  downloadPenerimaImportTemplate(selectedOutput)
                  setFeedback({ tone: 'success', message: 'Template komponen berhasil diunduh' })
                }}
              >
                <Download size={14} />
                <span>Template komponen ini</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={outputs.length === 0 || importing}
                onClick={() => {
                  downloadAllPenerimaImportTemplates(outputs)
                  setFeedback({ tone: 'success', message: 'Template semua komponen berhasil diunduh' })
                }}
              >
                <Download size={14} />
                <span>Template semua komponen</span>
              </Button>
            </div>
          </div>

          <FieldGroup label="File Excel">
            <Input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelChange}
              disabled={parsing || importing || !selectedOutput}
            />
          </FieldGroup>

          <FieldGroup label="ZIP Foto (opsional)" hint="Nama file di ZIP harus cocok dengan kolom nama_file_foto_* di Excel">
            <Input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleZipChange}
              disabled={parsing || importing || !excelFile}
            />
          </FieldGroup>

          <label className="neo-chip chip-toggle" style={{ width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={importFoto}
              onChange={(event) => setImportFoto(event.target.checked)}
              disabled={importing}
            />
            <span>Sekaligus import foto progress (0%, 25%, 50%, 75%, 100%)</span>
          </label>

          {feedback ? (
            <div
              className={`import-penerima-feedback import-penerima-feedback--${feedback.tone}`}
              role="status"
            >
              {feedback.tone === 'warning' || feedback.tone === 'danger' ? (
                <AlertTriangle size={16} />
              ) : null}
              <span>{feedback.message}</span>
            </div>
          ) : null}

          {parsing ? (
            <div className="loading-row">
              <Loader2 className="neo-spinner" size={16} />
              <span>Membaca file Excel...</span>
            </div>
          ) : null}

          {parsedResult ? (
            <div className="stack stack--compact">
              <div className="badge-row-inline">
                <Badge tone="neutral">{parsedResult.rows.length} baris terbaca</Badge>
                <Badge tone="success">{validRows.length} valid</Badge>
                {parsedResult.profile ? (
                  <Badge tone="info">Target {parsedResult.profile.targetRows}</Badge>
                ) : null}
                <Badge tone="info">{parsedResult.totalImages} slot foto siap</Badge>
              </div>

              <div className="table-wrap import-penerima-preview">
                <table className="neo-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      {isKomunal ? (
                        <>
                          <th>Unit</th>
                          <th>Label</th>
                        </>
                      ) : (
                        <>
                          <th>Nama</th>
                          <th>NIK</th>
                          <th>Jiwa</th>
                        </>
                      )}
                      <th>Koordinat</th>
                      <th>Foto</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.rows.slice(0, 50).map((row, index) => (
                      <PreviewRow key={`${row.nama}-${index}`} row={row} isKomunal={Boolean(isKomunal)} />
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedResult.rows.length > 50 ? (
                <p className="hint-text">Menampilkan 50 baris pertama dari {parsedResult.rows.length} baris.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="modal-actions">
          {progressLabel ? <p className="import-penerima-progress">{progressLabel}</p> : null}
          <Button type="button" variant="neutral" onClick={onClose} disabled={importing}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsedResult || validRows.length === 0 || parsing || importing || !importProfile}
            isLoading={importing}
          >
            <FileUp size={14} />
            <span>{importing ? 'Mengimport...' : importButtonLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function PreviewRow({ row, isKomunal }: { row: ParsedPenerimaRow; isKomunal: boolean }) {
  return (
    <tr>
      <td>{row.no ?? '-'}</td>
      {isKomunal ? (
        <>
          <td>{row.unitIndex ?? '-'}</td>
          <td>{row.nama || '-'}</td>
        </>
      ) : (
        <>
          <td>
            <div className="table-title">{row.nama || '-'}</div>
            {row.alamat ? <div className="table-subtitle">{row.alamat}</div> : null}
          </td>
          <td>
            <code style={{ fontSize: 11 }}>{row.nik || '-'}</code>
          </td>
          <td>{row.jumlah_jiwa}</td>
        </>
      )}
      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
        {row.koordinat || '-'}
      </td>
      <td>
        {row.fotoSlots.length > 0 ? (
          <div className="badge-row-inline">
            {FOTO_PROGRESS_LEVELS.map((level) => {
              const slot = row.fotoSlots.find((item) => item.level === level)
              if (!slot?.namaFile) {
                return null
              }
              return (
                <Badge key={level} tone={slot.imageFile ? 'success' : 'neutral'}>
                  {level}
                </Badge>
              )
            })}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td>
        {row.isValid ? (
          row.warnings.length > 0 ? (
            <Badge tone="warning">{row.warnings.length} peringatan</Badge>
          ) : (
            <Badge tone="success">Siap</Badge>
          )
        ) : (
          <Badge tone="danger">Invalid</Badge>
        )}
      </td>
    </tr>
  )
}
