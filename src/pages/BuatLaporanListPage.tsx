import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet } from 'lucide-react'
import { ApiError, getPekerjaanList } from '@/lib/api'
import { formatPercent } from '@/lib/format'
import {
  AnchorButton,
  Badge,
  Button,
  EmptyState,
  ProgressFill,
  SectionHeader,
  Spinner,
  Surface,
} from '@/components/ui'

export function BuatLaporanListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryText, setQueryText] = useState(searchParams.get('search') || '')
  const tahun = searchParams.get('tahun') || ''
  const page = Number(searchParams.get('page') || '1')

  const pekerjaan = useQuery({
    queryKey: ['buat-laporan', 'list', { tahun, search: queryText, page }],
    queryFn: () =>
      getPekerjaanList({
        per_page: 20,
        page,
        tahun: tahun || undefined,
        search: queryText || undefined,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
    retry: false,
  })

  const meta = pekerjaan.data?.meta as Record<string, unknown> | undefined
  const currentPage = Number(meta?.current_page || page)
  const lastPage = Number(meta?.last_page || 1)
  const pekerjaanError = pekerjaan.error instanceof ApiError ? pekerjaan.error : null

  return (
    <div className="stack">
      <SectionHeader
        title="Buat Laporan Mingguan"
        description="Pilih pekerjaan untuk mengisi atau memperbarui laporan progress mingguan (RAB)."
        action={
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault()
              const next = new URLSearchParams(searchParams)
              if (queryText) next.set('search', queryText)
              else next.delete('search')
              next.set('page', '1')
              setSearchParams(next)
            }}
          >
            <input
              className="neo-input toolbar-input"
              placeholder="Cari paket"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
            />
            <input
              className="neo-input toolbar-input toolbar-input--small"
              placeholder="Tahun"
              value={tahun}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('tahun', event.target.value)
                else next.delete('tahun')
                next.set('page', '1')
                setSearchParams(next)
              }}
            />
            <Button type="submit" size="sm">
              Cari
            </Button>
          </form>
        }
      />

      <Surface className="panel">
        {pekerjaan.isPending ? (
          <div className="empty-state">
            <Spinner />
            <div className="empty-state-title">Memuat pekerjaan...</div>
          </div>
        ) : pekerjaan.isError ? (
          <EmptyState
            title={pekerjaanError?.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat pekerjaan'}
            description={pekerjaanError?.message || 'Terjadi kesalahan saat mengambil data.'}
            action={
              <Button type="button" variant="neutral" size="sm" onClick={() => pekerjaan.refetch()}>
                Coba lagi
              </Button>
            }
          />
        ) : pekerjaan.data?.data?.length ? (
          <div className="table-wrap">
            <table className="neo-table buat-laporan-table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Kegiatan</th>
                  <th>Lokasi</th>
                  <th>Progress</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pekerjaan.data.data.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Paket">
                      <div className="table-title">{item.nama_paket}</div>
                      <div className="table-subtitle">{item.kode_rekening || '-'}</div>
                    </td>
                    <td data-label="Kegiatan">{item.kegiatan?.nama_sub_kegiatan || '-'}</td>
                    <td data-label="Lokasi">
                      {item.kecamatan?.nama_kecamatan || '-'} • {item.desa?.nama_desa || '-'}
                    </td>
                    <td data-label="Progress">
                      <div className="progress-inline">
                        <div className="progress-track">
                          <ProgressFill percent={Number(item.progress_total ?? 0)} />
                        </div>
                        <span>{formatPercent(item.progress_total ?? 0)}</span>
                      </div>
                    </td>
                    <td data-label="Aksi">
                      <AnchorButton to={`/buat-laporan/${item.id}`} className="neo-button--sm">
                        <FileSpreadsheet size={14} />
                        <span>Buat Laporan</span>
                      </AnchorButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Tidak ada pekerjaan"
            description="Belum ada paket yang bisa dilaporkan dengan filter saat ini."
          />
        )}
      </Surface>

      <div className="pagination">
        <Badge tone="neutral">
          Halaman {currentPage} dari {lastPage}
        </Badge>
        <div className="pagination-actions">
          <button
            type="button"
            className="neo-button neo-button--neutral neo-button--sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(Math.max(1, currentPage - 1)))
              setSearchParams(next)
            }}
            disabled={currentPage <= 1}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            className="neo-button neo-button--neutral neo-button--sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(Math.min(lastPage, currentPage + 1)))
              setSearchParams(next)
            }}
            disabled={currentPage >= lastPage}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}