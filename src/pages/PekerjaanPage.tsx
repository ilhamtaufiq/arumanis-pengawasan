import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { getPekerjaanList } from '@/lib/api'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { Badge, EmptyState, SectionHeader, Surface } from '@/components/ui'
import { useState } from 'react'

export function PekerjaanPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryText, setQueryText] = useState(searchParams.get('search') || '')
  const tahun = searchParams.get('tahun') || ''
  const page = Number(searchParams.get('page') || '1')

  const pekerjaan = useQuery({
    queryKey: ['pekerjaan', 'list', { tahun, search: queryText, page }],
    queryFn: () =>
      getPekerjaanList({
        per_page: 20,
        page,
        tahun: tahun || undefined,
        search: queryText || undefined,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
  })

  const meta = pekerjaan.data?.meta as Record<string, unknown> | undefined
  const currentPage = Number(meta?.current_page || page)
  const lastPage = Number(meta?.last_page || 1)

  return (
    <div className="stack">
      <SectionHeader
        title="Pekerjaan"
        description="Daftar paket yang dapat difilter, dibuka, dan dipantau per lokasi."
        action={
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault()
              const next = new URLSearchParams(searchParams)
              if (queryText) next.set('search', queryText)
              else next.delete('search')
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
                setSearchParams(next)
              }}
            />
          </form>
        }
      />

      <Surface className="panel">
        {pekerjaan.data?.data?.length ? (
          <div className="table-wrap">
            <table className="neo-table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Lokasi</th>
                  <th>Pagu</th>
                  <th>Progress</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {pekerjaan.data.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-title">
                        <Link to={`/pekerjaan/${item.id}`}>{item.nama_paket}</Link>
                        <div className="table-subtitle">{item.kode_rekening || '-'}</div>
                      </div>
                    </td>
                    <td>{item.kecamatan?.nama_kecamatan || item.desa?.nama_desa || '-'}</td>
                    <td>{formatCurrency(item.pagu ?? 0)}</td>
                    <td>
                      <div className="progress-inline">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.max(0, Math.min(Number(item.progress_total ?? 0), 100))}%` }}
                          />
                        </div>
                        <span>{formatPercent(item.progress_total ?? 0)}</span>
                      </div>
                    </td>
                    <td>{formatDate(item.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Tidak ada pekerjaan" description="Gunakan filter untuk menemukan paket yang relevan." />
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

