import { useMemo } from 'react'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { usePresenceOnline } from '@/hooks/usePresenceOnline'
import { PengawasLocationMap } from '@/components/PengawasLocationMap'
import { Badge, Button, EmptyState, MetricCard, SectionHeader, Spinner, Surface } from '@/components/ui'
import {
  countPengawasPresenceOnline,
  mapPresenceToLocationPoints,
  type PresenceOnlineUser,
} from '@pengawas/shared/presence'

export function PengawasLocationPage() {
  const presenceQuery = usePresenceOnline()
  const users = presenceQuery.data?.users ?? []
  const onlineWindowMinutes = presenceQuery.data?.onlineWindowMinutes ?? 5

  const counts = useMemo(() => countPengawasPresenceOnline(users), [users])
  const locationPoints = useMemo(() => mapPresenceToLocationPoints(users), [users])
  const onlineWithoutKoordinat = useMemo(
    () =>
      users.filter(
        (user) =>
          user.app === 'pengawasan' &&
          !locationPoints.some((point) => point.id === user.id),
      ),
    [locationPoints, users],
  )

  const error = presenceQuery.error instanceof ApiError ? presenceQuery.error : null

  return (
    <div className="stack">
      <SectionHeader
        title="Lokasi pengawas"
        description={`Koordinat terakhir dari aplikasi mobile (refresh otomatis ±30 detik, jendela online ${onlineWindowMinutes} menit).`}
        action={
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => void presenceQuery.refetch()}
            isLoading={presenceQuery.isFetching && !presenceQuery.isPending}
          >
            Muat ulang
          </Button>
        }
      />

      <div className="kpi-grid">
        {presenceQuery.isPending ? (
          <div className="grid-span-full">
            <Surface className="metric-card">
              <Spinner />
              <div className="metric-label">Memuat lokasi pengawas</div>
            </Surface>
          </div>
        ) : presenceQuery.isError ? (
          <div className="grid-span-full">
            <EmptyState
              title="Gagal memuat lokasi pengawas"
              description={error?.message || 'Terjadi kesalahan saat mengambil data presence.'}
              action={
                <Button type="button" variant="neutral" size="sm" onClick={() => void presenceQuery.refetch()}>
                  Coba lagi
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <MetricCard label="Pengawas online" value={String(counts.online)} hint="App pengawasan aktif" tone="info" />
            <MetricCard
              label="Dengan koordinat"
              value={String(counts.withKoordinat)}
              hint="Titik tampil di peta"
              tone={counts.withKoordinat > 0 ? 'success' : 'warning'}
            />
            <MetricCard
              label="Tanpa koordinat"
              value={String(counts.withoutKoordinat)}
              hint="Belum aktifkan GPS latar belakang"
              tone={counts.withoutKoordinat > 0 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      <Surface className="panel">
        <SectionHeader
          title="Peta lokasi"
          description="Titik koordinat terakhir yang dikirim pengawas dari aplikasi mobile."
        />
        {presenceQuery.isPending ? (
          <div className="empty-state">
            <Spinner />
            <div className="empty-state-title">Memuat peta...</div>
          </div>
        ) : locationPoints.length ? (
          <PengawasLocationMap points={locationPoints} />
        ) : (
          <EmptyState
            title="Belum ada koordinat pengawas"
            description="Aktifkan pelacakan GPS latar belakang di aplikasi mobile (Profil → Lokasi latar belakang), lalu tunggu heartbeat berikutnya."
          />
        )}
      </Surface>

      {locationPoints.length ? (
        <Surface className="panel">
          <SectionHeader title="Daftar pengawas di peta" description="Klik marker di peta untuk detail singkat." />
          <div className="table-wrap">
            <table className="neo-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Koordinat</th>
                  <th>Terakhir lokasi</th>
                  <th>Terakhir online</th>
                </tr>
              </thead>
              <tbody>
                {locationPoints.map((point) => (
                  <tr key={point.id}>
                    <td data-label="Nama">
                      <div className="table-title">{point.name}</div>
                      <div className="table-subtitle">{point.email}</div>
                    </td>
                    <td data-label="Koordinat">
                      <Badge tone="info">{point.koordinat}</Badge>
                    </td>
                    <td data-label="Terakhir lokasi">{formatDateTime(point.koordinat_at)}</td>
                    <td data-label="Terakhir online">{formatDateTime(point.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}

      {onlineWithoutKoordinat.length ? (
        <Surface className="panel">
          <SectionHeader
            title="Online tanpa koordinat"
            description="Pengawas terdeteksi online, tetapi belum mengirim titik GPS."
          />
          <div className="summary-list">
            {onlineWithoutKoordinat.map((user: PresenceOnlineUser) => (
              <div key={user.id} className="summary-row summary-row--wrap">
                <div className="summary-row-copy">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Badge tone="warning">Tanpa koordinat</Badge>
              </div>
            ))}
          </div>
        </Surface>
      ) : null}
    </div>
  )
}