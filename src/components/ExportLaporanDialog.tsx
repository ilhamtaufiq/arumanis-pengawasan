import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  X,
} from 'lucide-react'
import { Badge, Button, Input, Label } from '@/components/ui'
import { formatApiError, getAppSettings } from '@/lib/api'
import type { ProgressItem, ProgressReportView } from '@/lib/types'
import {
  buildExportAutofill,
  buildLaporanFileName,
  generateExcel,
  generatePdf,
  loadExportSettingsOverrides,
  mapProgressReportForExport,
  saveExportSettingsOverrides,
  type AppSettingLike,
  type DpaData,
  type ProgressReportData,
  type SignatureData,
} from '@/lib/laporan-export'

type ExportLaporanDialogProps = {
  open: boolean
  onClose: () => void
  progressView: ProgressReportView | null | undefined
  /** Item di layar (bisa beda dari view bila ada edit belum refetch) */
  items: ProgressItem[]
  weekCount: number
  activeWeek: number
  hasUnsavedEdits?: boolean
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

export function ExportLaporanDialog({
  open,
  onClose,
  progressView,
  items,
  weekCount,
  activeWeek,
  hasUnsavedEdits = false,
  onError,
  onSuccess,
}: ExportLaporanDialogProps) {
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single')
  const [selectedPrintWeek, setSelectedPrintWeek] = useState(Math.max(1, activeWeek))
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null)
  const [dpaData, setDpaData] = useState<DpaData | null>(null)
  const [autofillSources, setAutofillSources] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<AppSettingLike[]>([])
  const [exporting, setExporting] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [tanggalLaporanManual, setTanggalLaporanManual] = useState(false)
  const [showLogoAms, setShowLogoAms] = useState(false)
  const [showLogoArumanis, setShowLogoArumanis] = useState(false)

  const reportBase = useMemo(
    () => mapProgressReportForExport(progressView, items),
    [progressView, items],
  )

  const exportWeekOpts = useMemo(() => {
    if (printMode === 'all') {
      return { weekNumber: 1, throughWeek: weekCount }
    }
    return { weekNumber: selectedPrintWeek, throughWeek: selectedPrintWeek }
  }, [printMode, selectedPrintWeek, weekCount])

  const weekLabel = useMemo(() => {
    if (printMode === 'all') return `M1-M${weekCount}`
    return `M${selectedPrintWeek}`
  }, [printMode, weekCount, selectedPrintWeek])

  function applyAutofill(
    report: ProgressReportData | null,
    appSettings: AppSettingLike[],
    opts?: { keepManualOverrides?: boolean; preserveManualTanggal?: boolean },
  ) {
    const overrides = opts?.keepManualOverrides ? loadExportSettingsOverrides() : {}
    const sigOver = { ...(overrides.signatureOverrides ?? {}) }
    if (!opts?.preserveManualTanggal || !tanggalLaporanManual) {
      delete sigOver.tanggal
    }
    const filled = buildExportAutofill(
      report,
      appSettings,
      { ...overrides, signatureOverrides: sigOver },
      exportWeekOpts,
    )
    if (opts?.preserveManualTanggal && tanggalLaporanManual && signatureData?.tanggal) {
      filled.signatureData.tanggal = signatureData.tanggal
      filled.sources.tanggalLaporan = 'Manual (diedit user)'
    }
    setSignatureData(filled.signatureData)
    setDpaData(filled.dpaData)
    setAutofillSources(filled.sources)
    if (!opts?.preserveManualTanggal) {
      setTanggalLaporanManual(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSelectedPrintWeek(Math.min(Math.max(1, activeWeek), weekCount))
    setTanggalLaporanManual(false)
    setLoadingSettings(true)
    void (async () => {
      let appSettings: AppSettingLike[] = []
      try {
        appSettings = await getAppSettings()
      } catch {
        appSettings = []
      }
      setSettings(appSettings)
      applyAutofill(reportBase, appSettings, {
        keepManualOverrides: true,
        preserveManualTanggal: false,
      })
      setLoadingSettings(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open / report identity
  }, [open, reportBase?.pekerjaan.id, reportBase?.max_minggu])

  // Update tanggal otomatis saat ganti minggu/mode (jika tidak manual)
  useEffect(() => {
    if (!open || !reportBase || !signatureData) return
    if (tanggalLaporanManual) return
    const filled = buildExportAutofill(reportBase, settings, {}, exportWeekOpts)
    setSignatureData((prev) => (prev ? { ...prev, tanggal: filled.signatureData.tanggal } : prev))
    setAutofillSources((prev) => ({
      ...prev,
      tanggalLaporan: filled.sources.tanggalLaporan || '—',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportWeekOpts.weekNumber, exportWeekOpts.throughWeek, printMode])

  if (!open) return null

  function persistFields() {
    if (!signatureData || !dpaData) return
    saveExportSettingsOverrides({
      signatureOverrides: signatureData,
      dpaOverrides: dpaData,
    })
  }

  function getExportWeekCount() {
    return printMode === 'single' ? selectedPrintWeek : weekCount
  }

  function getExportWeekNumbers() {
    return printMode === 'all'
      ? Array.from({ length: weekCount }, (_, index) => index + 1)
      : undefined
  }

  function buildPayload(): ProgressReportData | null {
    if (!reportBase) return null
    return {
      ...reportBase,
      items: reportBase.items,
      max_minggu: weekCount,
    }
  }

  async function handleExportPdf() {
    if (!signatureData || !dpaData) return
    if (hasUnsavedEdits) {
      const ok = window.confirm(
        'Ada perubahan yang belum disimpan. Export memakai data di layar saat ini. Lanjutkan?',
      )
      if (!ok) return
    }
    const payload = buildPayload()
    if (!payload) {
      onError?.('Data laporan belum siap diekspor.')
      return
    }
    const fileName = buildLaporanFileName(payload.pekerjaan.nama, weekLabel, 'pdf')
    setExporting(true)
    try {
      persistFields()
      const weekNumbers = getExportWeekNumbers()
      await generatePdf({
        report: payload,
        weekCount: getExportWeekCount(),
        ...(weekNumbers ? { weekNumbers } : {}),
        signatureData,
        dpaData,
        fileName,
        showLogoAms,
        showLogoArumanis,
      })
      onSuccess?.(`PDF diunduh: ${fileName}`)
      onClose()
    } catch (error) {
      console.error(error)
      onError?.(formatApiError(error, 'Gagal membuat PDF laporan.'))
    } finally {
      setExporting(false)
    }
  }

  function handleExportExcel() {
    if (!signatureData || !dpaData) return
    if (hasUnsavedEdits) {
      const ok = window.confirm(
        'Ada perubahan yang belum disimpan. Export memakai data di layar saat ini. Lanjutkan?',
      )
      if (!ok) return
    }
    const payload = buildPayload()
    if (!payload) {
      onError?.('Data laporan belum siap diekspor.')
      return
    }
    const fileName = buildLaporanFileName(payload.pekerjaan.nama, weekLabel, 'xlsx')
    setExporting(true)
    try {
      persistFields()
      generateExcel({
        report: payload,
        weekCount: getExportWeekCount(),
        dpaData,
        fileName,
      })
      onSuccess?.(`Excel diunduh: ${fileName}`)
    } catch (error) {
      console.error(error)
      onError?.(formatApiError(error, 'Gagal membuat Excel laporan.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-shell export-laporan-modal-shell">
        <div className="modal-header">
          <div>
            <h2>
              <FileDown className="inline-icon" size={18} /> Pengaturan Export Laporan
            </h2>
            <p className="modal-subtitle">
              Data pejabat &amp; DPA diisi otomatis dari sub kegiatan, pengawas, penyedia, dan
              pengaturan aplikasi. Bisa diubah manual sebelum export.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="export-laporan-body">
          {hasUnsavedEdits ? (
            <div className="export-laporan-warn">
              <AlertTriangle size={16} />
              <span>
                Ada perubahan progress yang belum disimpan. Export memakai data di layar saat ini.
              </span>
            </div>
          ) : null}

          <div className="export-laporan-section export-laporan-section--sky">
            <div className="export-laporan-section-head">
              <h4>Sumber autofill</h4>
              <Button
                type="button"
                size="sm"
                variant="neutral"
                disabled={loadingSettings || !reportBase}
                onClick={() => {
                  setTanggalLaporanManual(false)
                  applyAutofill(reportBase, settings, {
                    keepManualOverrides: false,
                    preserveManualTanggal: false,
                  })
                  onSuccess?.('Autofill direset dari data master')
                }}
              >
                <RefreshCw size={14} />
                Muat ulang
              </Button>
            </div>
            <ul className="export-laporan-sources">
              <li>
                <strong>DPA:</strong> {autofillSources.dpa || '—'}
              </li>
              <li>
                <strong>Mengetahui (PPTK):</strong> {autofillSources.mengetahui || '—'}
              </li>
              <li>
                <strong>Diperiksa (Pengawas):</strong> {autofillSources.diperiksa || '—'}
              </li>
              <li>
                <strong>Penyedia:</strong> {autofillSources.penyedia || '—'}
              </li>
              <li className="export-laporan-sources-full">
                <strong>Tanggal Laporan:</strong> {autofillSources.tanggalLaporan || '—'}
              </li>
            </ul>
          </div>

          <div className="export-laporan-section">
            <h4>
              <Calendar size={14} /> Opsi cetak
            </h4>
            <div className="export-laporan-print-modes">
              <button
                type="button"
                className={
                  printMode === 'single'
                    ? 'export-laporan-mode is-active'
                    : 'export-laporan-mode'
                }
                onClick={() => setPrintMode('single')}
              >
                <strong>Cetak minggu tertentu</strong>
                <span>Satu minggu yang dipilih</span>
              </button>
              <button
                type="button"
                className={
                  printMode === 'all' ? 'export-laporan-mode is-active' : 'export-laporan-mode'
                }
                onClick={() => setPrintMode('all')}
              >
                <strong>Cetak semua minggu</strong>
                <span>Minggu 1 s/d {weekCount}</span>
              </button>
            </div>
            {printMode === 'single' ? (
              <div className="export-laporan-field-row">
                <Label>Minggu ke</Label>
                <Input
                  type="number"
                  min={1}
                  max={weekCount}
                  value={selectedPrintWeek}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10) || 1
                    setSelectedPrintWeek(Math.min(Math.max(value, 1), weekCount))
                  }}
                />
                <span className="export-laporan-hint">1 – {weekCount}</span>
              </div>
            ) : null}
            <div className="export-laporan-logo-opts">
              <label>
                <input
                  type="checkbox"
                  checked={showLogoAms}
                  onChange={(e) => setShowLogoAms(e.target.checked)}
                />{' '}
                Logo AMS di PDF
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showLogoArumanis}
                  onChange={(e) => setShowLogoArumanis(e.target.checked)}
                />{' '}
                Logo Arumanis di PDF
              </label>
              <Badge tone="neutral">Cianjurkab selalu tampil</Badge>
            </div>
          </div>

          {signatureData && dpaData ? (
            <>
              <div className="export-laporan-section export-laporan-section--purple">
                <h4>Data DPA</h4>
                <div className="export-laporan-grid-2">
                  <div>
                    <Label>Nomor DPA</Label>
                    <Input
                      value={dpaData.nomorDpa}
                      onChange={(e) => setDpaData({ ...dpaData, nomorDpa: e.target.value })}
                      placeholder="Dari pengaturan aplikasi"
                    />
                  </div>
                  <div>
                    <Label>Tanggal DPA</Label>
                    <Input
                      type="date"
                      value={dpaData.tanggalDpa}
                      onChange={(e) => setDpaData({ ...dpaData, tanggalDpa: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="export-laporan-grid-2">
                <div className="export-laporan-section export-laporan-section--blue">
                  <h4>Mengetahui (PPTK)</h4>
                  <Label>Nama</Label>
                  <Input
                    value={signatureData.namaMengetahui}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, namaMengetahui: e.target.value })
                    }
                  />
                  <Label>NIP</Label>
                  <Input
                    value={signatureData.nipMengetahui}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, nipMengetahui: e.target.value })
                    }
                  />
                  <Label>Jabatan</Label>
                  <Input
                    value={signatureData.jabatanMengetahui}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, jabatanMengetahui: e.target.value })
                    }
                  />
                </div>
                <div className="export-laporan-section export-laporan-section--green">
                  <h4>Diperiksa (Pengawas)</h4>
                  <Label>Nama</Label>
                  <Input
                    value={signatureData.namaDiperiksa}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, namaDiperiksa: e.target.value })
                    }
                  />
                  <Label>NIP</Label>
                  <Input
                    value={signatureData.nipDiperiksa}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, nipDiperiksa: e.target.value })
                    }
                  />
                  <Label>Jabatan</Label>
                  <Input
                    value={signatureData.jabatanDiperiksa}
                    onChange={(e) =>
                      setSignatureData({ ...signatureData, jabatanDiperiksa: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="export-laporan-section export-laporan-section--red">
                <h4>Penyedia / Kontraktor</h4>
                <div className="export-laporan-grid-2">
                  <div>
                    <Label>Nama perusahaan</Label>
                    <Input
                      value={signatureData.namaPerusahaan}
                      onChange={(e) =>
                        setSignatureData({ ...signatureData, namaPerusahaan: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Nama direktur</Label>
                    <Input
                      value={signatureData.namaDirektur}
                      onChange={(e) =>
                        setSignatureData({ ...signatureData, namaDirektur: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Lokasi tanda tangan</Label>
                    <Input
                      value={signatureData.lokasi}
                      onChange={(e) =>
                        setSignatureData({ ...signatureData, lokasi: e.target.value })
                      }
                      placeholder="Cianjur"
                    />
                    <p className="export-laporan-hint">
                      Tempat tanda tangan (kota/kab), bukan desa lokasi pekerjaan.
                    </p>
                  </div>
                  <div>
                    <div className="export-laporan-label-row">
                      <Label>Tanggal laporan</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!reportBase) return
                          const filled = buildExportAutofill(reportBase, settings, {}, exportWeekOpts)
                          setTanggalLaporanManual(false)
                          setSignatureData({
                            ...signatureData,
                            tanggal: filled.signatureData.tanggal,
                            lokasi: filled.signatureData.lokasi,
                          })
                          setAutofillSources((prev) => ({
                            ...prev,
                            tanggalLaporan: filled.sources.tanggalLaporan || '—',
                          }))
                        }}
                      >
                        Isi dari minggu
                      </Button>
                    </div>
                    <Input
                      value={signatureData.tanggal}
                      onChange={(e) => {
                        setTanggalLaporanManual(true)
                        setSignatureData({ ...signatureData, tanggal: e.target.value })
                        setAutofillSources((prev) => ({
                          ...prev,
                          tanggalLaporan: 'Manual (diedit user)',
                        }))
                      }}
                      placeholder="Contoh: 30 Juni 2026"
                    />
                    <p className="export-laporan-hint">
                      Otomatis = akhir minggu laporan (berdasar SPMK). Bisa diubah manual.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="export-laporan-loading">
              {loadingSettings ? 'Memuat autofill…' : 'Data laporan belum siap.'}
            </p>
          )}
        </div>

        <div className="modal-actions">
          <Button type="button" variant="neutral" onClick={onClose} disabled={exporting}>
            Tutup
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportExcel}
            disabled={exporting || !signatureData || !dpaData}
            isLoading={exporting}
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleExportPdf()}
            disabled={exporting || !signatureData || !dpaData}
            isLoading={exporting}
          >
            <FileDown size={14} />
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
