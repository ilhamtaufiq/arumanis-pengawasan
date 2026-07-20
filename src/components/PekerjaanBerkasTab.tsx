import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, RefreshCcw, Upload } from 'lucide-react'
import { createBerkas, formatApiError, getAppSettings, getBerkasList } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import {
  getPengawasVisibleBerkasJuduls,
  matchesPengawasSharedBerkasJudul,
} from '@/lib/pengawas-berkas-settings'
import {
  AlertModal,
  Button,
  EmptyState,
  FieldGroup,
  Input,
  LoadingRow,
  Spinner,
  StatusChip,
} from '@/components/ui'
import type { Berkas } from '@pengawas/shared'

type PekerjaanBerkasTabProps = {
  pekerjaanId: number
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function BerkasCard({ item }: { item: Berkas }) {
  const title = item.jenis_dokumen || item.file_name || `Berkas #${item.id}`
  const href = item.berkas_url || undefined

  return (
    <div className="detail-output-card">
      <div className="detail-output-card-head">
        <div>
          <div className="output-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} aria-hidden />
            {title}
          </div>
          <div className="output-meta">
            {item.file_name ? <span>{item.file_name}</span> : null}
            {item.file_name && item.size != null ? <span> · </span> : null}
            <span>{formatFileSize(item.size)}</span>
            {item.created_at ? (
              <>
                <span> · </span>
                <span>{formatDateTime(item.created_at)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="detail-inline-controls" style={{ marginTop: 12 }}>
        {href ? (
          <a
            className="neo-button neo-button--sm neo-button--neutral"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={14} />
            Lihat / unduh
          </a>
        ) : (
          <span className="detail-muted-line">URL file tidak tersedia</span>
        )}
      </div>
    </div>
  )
}

export function PekerjaanBerkasTab({ pekerjaanId }: PekerjaanBerkasTabProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [jenisDokumen, setJenisDokumen] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings,
    staleTime: 60_000,
  })

  const sharedJuduls = useMemo(
    () => getPengawasVisibleBerkasJuduls(settingsQuery.data),
    [settingsQuery.data],
  )

  const berkasQuery = useQuery({
    queryKey: ['pekerjaan', 'berkas', pekerjaanId, 'mine', sharedJuduls.join('|')],
    queryFn: () =>
      getBerkasList({
        pekerjaan_id: pekerjaanId,
        mine: true,
        per_page: 100,
      }),
    enabled: Number.isFinite(pekerjaanId),
  })

  const list = useMemo(() => berkasQuery.data?.data ?? [], [berkasQuery.data])

  const { sharedList, ownList } = useMemo(() => {
    const shared: Berkas[] = []
    const own: Berkas[] = []
    for (const item of list) {
      if (matchesPengawasSharedBerkasJudul(item.jenis_dokumen, sharedJuduls)) {
        shared.push(item)
      } else {
        own.push(item)
      }
    }
    return { sharedList: shared, ownList: own }
  }, [list, sharedJuduls])

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Pilih file terlebih dahulu.')
      }
      const label = jenisDokumen.trim() || file.name
      const formData = new FormData()
      formData.append('pekerjaan_id', String(pekerjaanId))
      formData.append('jenis_dokumen', label)
      formData.append('file', file)
      return createBerkas(formData)
    },
    onSuccess: async () => {
      setJenisDokumen('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setSuccessMessage('Berkas berhasil diunggah.')
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'berkas', pekerjaanId] })
    },
    onError: (error) => {
      setSuccessMessage(null)
      setErrorMessage(formatApiError(error) || 'Gagal mengunggah berkas.')
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setErrorMessage('Pilih file yang akan diunggah.')
      return
    }
    uploadMutation.mutate()
  }

  return (
    <div className="stack stack--compact">
      <div className="detail-status-bar">
        <StatusChip>
          File saya: <strong>{formatNumber(ownList.length)}</strong>
        </StatusChip>
        {sharedJuduls.length > 0 ? (
          <StatusChip>
            Bersama ({sharedJuduls.join(', ')}): <strong>{formatNumber(sharedList.length)}</strong>
          </StatusChip>
        ) : null}
        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="status-bar-end"
          onClick={() => berkasQuery.refetch()}
          disabled={berkasQuery.isFetching}
        >
          <RefreshCcw size={14} />
          Muat ulang
        </Button>
      </div>

      {sharedJuduls.length > 0 ? (
        <div className="detail-section-full">
          <div className="detail-tab-header">
            <div className="detail-tab-header-left">
              <h2>Berkas bersama</h2>
              <p>
                Dokumen pekerjaan dengan judul {sharedJuduls.join(', ')} (diaktifkan admin di
                Pengaturan Arumanis).
              </p>
            </div>
          </div>

          {berkasQuery.isPending ? (
            <LoadingRow>Memuat berkas bersama...</LoadingRow>
          ) : berkasQuery.isError ? (
            <EmptyState
              title="Gagal memuat berkas"
              description={formatApiError(berkasQuery.error) || 'Coba muat ulang.'}
              action={
                <Button type="button" variant="neutral" size="sm" onClick={() => berkasQuery.refetch()}>
                  Coba lagi
                </Button>
              }
            />
          ) : sharedList.length === 0 ? (
            <EmptyState
              title="Belum ada berkas bersama"
              description={`Belum ada file dengan judul ${sharedJuduls.join(', ')} untuk pekerjaan ini.`}
            />
          ) : (
            <div className="detail-output-grid">
              {sharedList.map((item) => (
                <BerkasCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Upload berkas</h2>
            <p>Hanya unggah dokumen. Anda melihat file unggahan akun ini ditambah berkas bersama (jika diaktifkan).</p>
          </div>
        </div>

        <form className="neo-form" onSubmit={handleSubmit}>
          <div className="detail-grid detail-grid--auto">
            <FieldGroup
              label="Jenis / keterangan dokumen"
              hint="Opsional — jika kosong, nama file dipakai."
            >
              <Input
                id="berkas-jenis"
                value={jenisDokumen}
                onChange={(e) => setJenisDokumen(e.target.value)}
                placeholder="Contoh: Berita acara, SK, laporan"
                maxLength={255}
              />
            </FieldGroup>
            <FieldGroup label="File" hint="Maks. 50 MB. PDF, gambar, Office, dll.">
              <input
                id="berkas-file"
                ref={fileInputRef}
                type="file"
                className="neo-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </FieldGroup>
          </div>

          {file ? (
            <p className="detail-muted-line">
              Dipilih: <strong>{file.name}</strong> ({formatFileSize(file.size)})
            </p>
          ) : null}

          <div className="detail-inline-controls">
            <Button type="submit" disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending ? <Spinner /> : <Upload size={14} />}
              {uploadMutation.isPending ? 'Mengunggah...' : 'Unggah berkas'}
            </Button>
          </div>
        </form>
      </div>

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Berkas saya</h2>
            <p>Daftar file yang Anda unggah untuk pekerjaan ini</p>
          </div>
        </div>

        {berkasQuery.isPending ? (
          <LoadingRow>Memuat berkas...</LoadingRow>
        ) : berkasQuery.isError ? (
          <EmptyState
            title="Gagal memuat berkas"
            description={formatApiError(berkasQuery.error) || 'Coba muat ulang.'}
            action={
              <Button type="button" variant="neutral" size="sm" onClick={() => berkasQuery.refetch()}>
                Coba lagi
              </Button>
            }
          />
        ) : ownList.length === 0 ? (
          <EmptyState
            title="Belum ada berkas"
            description="Unggah dokumen pertama menggunakan form di atas."
          />
        ) : (
          <div className="detail-output-grid">
            {ownList.map((item) => (
              <BerkasCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <AlertModal
        open={Boolean(errorMessage)}
        title="Upload berkas"
        description={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <AlertModal
        open={Boolean(successMessage)}
        title="Berhasil"
        description={successMessage || ''}
        onClose={() => setSuccessMessage(null)}
      />
    </div>
  )
}
