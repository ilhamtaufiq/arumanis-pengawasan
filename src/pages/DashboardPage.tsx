import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getPekerjaanList } from '@/lib/api'
import { formatNumber, formatPercent } from '@/lib/format'
import { AnchorButton, Badge, Button, EmptyState, MetricCard, SectionHeader, Spinner, Surface } from '@/components/ui'

type FotoStatus = 'belum_ada_foto' | 'belum_selesai' | 'selesai'

function resolveFotoStatus(item: { foto_status?: FotoStatus | null; foto_count?: number | null }) {
  if (item.foto_status === 'belum_ada_foto' || item.foto_status === 'belum_selesai' || item.foto_status === 'selesai') {
    return item.foto_status
  }

  return Number(item.foto_count ?? 0) <= 0 ? 'belum_ada_foto' : 'belum_selesai'
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tahun = searchParams.get('tahun') || ''
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const pekerjaanQuery = useQuery({
    queryKey: ['pekerjaan', 'dashboard', 'summary'],
    queryFn: () =>
      getPekerjaanList({
        per_page: -1,
        summary: 1,
      }),
    retry: false,
  })

  const pekerjaanData = pekerjaanQuery.data?.data ?? []
  const pekerjaanError = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null
  const filteredPekerjaan = useMemo(() => {
    return pekerjaanData.filter((item) => {
      const matchesSearch = !search || `${item.nama_paket} ${item.kode_rekening || ''}`.toLowerCase().includes(search.toLowerCase())
      const matchesYear = !tahun || `${item.kegiatan?.tahun_anggaran || ''}` === tahun
      return matchesSearch && matchesYear
    })
  }, [pekerjaanData, search, tahun])

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        pekerjaanData
          .map((item) => item.kegiatan?.tahun_anggaran)
          .filter((value): value is string | number => value !== undefined && value !== null),
      ),
    ).map((year) => `${year}`)
  }, [pekerjaanData])

  const totalPekerjaan = filteredPekerjaan.length
  const belumProgressCount = filteredPekerjaan.filter((item) => Number(item.progress_total ?? 0) <= 0).length
  const belumAdaFotoCount = filteredPekerjaan.filter((item) => resolveFotoStatus(item) === 'belum_ada_foto').length
  const belumSelesaiFotoCount = filteredPekerjaan.filter((item) => resolveFotoStatus(item) === 'belum_selesai').length
  const fotoBelumLengkapCount = belumAdaFotoCount + belumSelesaiFotoCount
  const deviasiCount = filteredPekerjaan.filter((item) => Math.abs(Number(item.deviasi ?? 0)) > 0.01).length

  const perhatianList = useMemo(
    () =>
      filteredPekerjaan
        .map((item) => {
          const progress = Number(item.progress_total ?? 0)
          const deviasi = Number(item.deviasi ?? 0)
          const fotoStatus = resolveFotoStatus(item)

          return {
            item,
            progress,
            deviasi,
            fotoStatus,
            issues: [
              progress <= 0 ? 'Belum mengisi progress' : null,
              Math.abs(deviasi) > 0.01 ? 'Ada deviasi' : null,
              fotoStatus === 'belum_ada_foto' ? 'Belum ada foto' : null,
              fotoStatus === 'belum_selesai' ? 'Belum Selesai' : null,
            ].filter(Boolean) as string[],
          }
        })
        .filter((entry) => entry.issues.length > 0),
    [filteredPekerjaan],
  )

  return (
    <div className="stack">
      <SectionHeader
        title="Ringkasan pekerjaan diawasi"
        description="Ikhtisar paket yang diawasi akun ini, dengan indikator progress, deviasi, dan foto."
        action={
          <div className="toolbar">
            <form
              className="toolbar-form"
              onSubmit={(event) => {
                event.preventDefault()
                const next = new URLSearchParams(searchParams)
                if (tahun) next.set('tahun', tahun)
                if (search) next.set('search', search)
                setSearchParams(next)
              }}
            >
              <input
                className="neo-input toolbar-input"
                placeholder="Cari paket"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="neo-input toolbar-select"
                value={tahun}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams)
                  if (event.target.value) next.set('tahun', event.target.value)
                  else next.delete('tahun')
                  setSearchParams(next)
                }}
              >
                <option value="">Semua tahun</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </form>
          </div>
        }
      />

      <div className="kpi-grid">
        {pekerjaanQuery.isPending ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <Surface className="metric-card">
              <Spinner />
              <div className="metric-label">Memuat ringkasan</div>
              <div className="metric-hint">Mengambil data dari server.</div>
            </Surface>
          </div>
        ) : pekerjaanQuery.isError ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title={pekerjaanError?.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat ringkasan'}
              description={
                pekerjaanError?.status === 401
                  ? 'Sesi login sudah tidak terbaca oleh server.'
                  : pekerjaanError?.message || 'Terjadi kesalahan saat mengambil data ringkasan pekerjaan.'
              }
              action={
                <div className="pagination-actions" style={{ justifyContent: 'flex-start' }}>
                  <Button type="button" variant="neutral" size="sm" onClick={() => pekerjaanQuery.refetch()}>
                    Coba lagi
                  </Button>
                  {pekerjaanError?.status === 401 ? (
                    <Button type="button" variant="primary" size="sm" onClick={() => window.location.assign(`${import.meta.env.BASE_URL}login`)}>
                      Masuk ulang
                    </Button>
                  ) : null}
                </div>
              }
            />
          </div>
        ) : (
          <>
            <MetricCard label="Jumlah paket pekerjaan" value={formatNumber(totalPekerjaan)} hint="Paket yang masuk filter aktif" tone="info" />
            <MetricCard
              label="Belum isi progress"
              value={formatNumber(belumProgressCount)}
              hint="Perlu update progress pekerjaan"
              tone={belumProgressCount > 0 ? 'warning' : 'success'}
            />
            <MetricCard
              label="Paket deviasi"
              value={formatNumber(deviasiCount)}
              hint="Ada selisih progress dan rencana"
              tone={deviasiCount > 0 ? 'danger' : 'success'}
            />
            <MetricCard
              label="Foto belum lengkap"
              value={formatNumber(fotoBelumLengkapCount)}
              hint={`${formatNumber(belumAdaFotoCount)} belum ada, ${formatNumber(belumSelesaiFotoCount)} belum selesai`}
              tone={fotoBelumLengkapCount > 0 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      <Surface className="panel">
        <SectionHeader title="Pekerjaan yang diawas" description="Daftar paket dengan status progress, deviasi, dan foto." />
        {pekerjaanQuery.isPending ? (
          <div className="empty-state">
            <Spinner />
            <div className="empty-state-title">Memuat ringkasan pekerjaan...</div>
            <div className="empty-state-description">Mengambil daftar paket dari server.</div>
          </div>
        ) : pekerjaanQuery.isError ? (
          <EmptyState
            title={pekerjaanError?.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat pekerjaan'}
            description={pekerjaanError?.message || 'Terjadi kesalahan saat mengambil daftar paket pekerjaan.'}
          />
        ) : filteredPekerjaan.length ? (
          <div className="table-wrap">
            <table className="neo-table dashboard-summary-table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Progress</th>
                  <th>Deviasi</th>
                  <th>Foto</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPekerjaan.map((item) => {
                  const progress = Number(item.progress_total ?? 0)
                  const deviasi = Number(item.deviasi ?? 0)
                  const fotoStatus = resolveFotoStatus(item)
                  const fotoCount = Number(item.foto_count ?? 0)
                  const fotoRequiredCount = Number(item.foto_required_count ?? 0)
                  const issues = [
                    progress <= 0 ? 'Progress' : null,
                    Math.abs(deviasi) > 0.01 ? 'Deviasi' : null,
                    fotoStatus === 'belum_ada_foto' ? 'Belum ada foto' : null,
                    fotoStatus === 'belum_selesai' ? 'Belum Selesai' : null,
                  ].filter(Boolean) as string[]

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="table-title">
                          <Link to={`/pekerjaan/${item.id}`}>{item.nama_paket}</Link>
                          <div className="table-subtitle">
                            {item.kecamatan?.nama_kecamatan || item.desa?.nama_desa || '-'} - {item.kode_rekening || '-'}
                          </div>
                        </div>
                      </td>
                      <td>
                        {progress > 0 ? (
                          <Badge tone="success">{formatPercent(progress)}</Badge>
                        ) : (
                          <Badge tone="warning">Belum diisi</Badge>
                        )}
                      </td>
                      <td>
                        {Math.abs(deviasi) > 0.01 ? (
                          <Badge tone={deviasi < 0 ? 'danger' : 'success'}>{formatPercent(deviasi)}</Badge>
                        ) : (
                          <Badge tone="neutral">0%</Badge>
                        )}
                      </td>
                      <td>
                        {fotoStatus === 'selesai' ? (
                          <Badge tone="success">
                            {formatNumber(fotoCount)} foto
                          </Badge>
                        ) : fotoStatus === 'belum_selesai' ? (
                          <Badge tone="danger">
                            Belum Selesai
                          </Badge>
                        ) : (
                          <Badge tone="warning">Belum ada foto</Badge>
                        )}
                        {fotoRequiredCount > 0 && fotoStatus !== 'selesai' ? (
                          <div className="table-subtitle">
                            {formatNumber(fotoCount)} / {formatNumber(fotoRequiredCount)} foto
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div className="dashboard-issues">
                          {issues.map((issue) => (
                            <Badge key={issue} tone="warning">
                              {issue}
                            </Badge>
                          ))}
                          {!issues.length ? <Badge tone="success">Aman</Badge> : null}
                        </div>
                      </td>
                      <td>
                        <AnchorButton variant="neutral" to={`/pekerjaan/${item.id}`} className="neo-button--sm">
                          Detail
                        </AnchorButton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Tidak ada pekerjaan" description="Coba ubah filter tahun atau pencarian paket." />
        )}
      </Surface>

      {perhatianList.length ? (
        <Surface className="panel">
          <SectionHeader title="Paket perlu perhatian" description="Paket berikut belum lengkap atau memiliki deviasi." />
          <div className="summary-list">
            {perhatianList.slice(0, 8).map((entry) => (
              <div key={entry.item.id} className="summary-row summary-row--wrap">
                <div className="summary-row-copy">
                  <strong>{entry.item.nama_paket}</strong>
                  <span>{entry.item.kecamatan?.nama_kecamatan || entry.item.desa?.nama_desa || '-'}</span>
                </div>
                  <div className="dashboard-issues">
                    {entry.progress <= 0 ? <Badge tone="warning">Progress</Badge> : null}
                    {Math.abs(entry.deviasi) > 0.01 ? (
                      <Badge tone={entry.deviasi < 0 ? 'danger' : 'success'}>Deviasi {formatPercent(entry.deviasi)}</Badge>
                    ) : null}
                  {entry.fotoStatus === 'belum_ada_foto' ? <Badge tone="warning">Belum ada foto</Badge> : null}
                  {entry.fotoStatus === 'belum_selesai' ? <Badge tone="danger">Belum Selesai</Badge> : null}
                  </div>
                </div>
            ))}
          </div>
        </Surface>
      ) : null}
    </div>
  )
}
