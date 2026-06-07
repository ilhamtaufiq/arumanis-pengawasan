import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getPengawasList, me } from '@/lib/api'
import { formatDateTime, formatCurrency, formatNumber } from '@/lib/format'
import { Badge, EmptyState, SectionHeader, Surface } from '@/components/ui'

export function ProfilePage() {
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
  })

  const pengawasQuery = useQuery({
    queryKey: ['pengawas', 'list'],
    queryFn: getPengawasList,
  })

  const user = meQuery.data
  const matchedPengawas = pengawasQuery.data?.find((item) => item.nip && item.nip === user?.nip) || null

  if (meQuery.isLoading) {
    return <Surface className="panel">Memuat profil...</Surface>
  }

  if (!user) {
    return <EmptyState title="Profil tidak tersedia" />
  }

  return (
    <div className="stack">
      <SectionHeader title="Profil" description="Identitas pengguna dan kecocokan data pengawas." />

      <div className="content-grid content-grid--wide">
        <Surface className="panel">
          <SectionHeader title="Identitas" />
          <div className="detail-grid">
            <DetailRow label="Nama" value={user.name} />
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="NIP" value={user.nip || '-'} />
            <DetailRow label="Role" value={Array.isArray(user.roles) && user.roles.length ? user.roles[0]?.name : '-'} />
          </div>
          <div className="badge-row">
            {(user.permissions || []).slice(0, 6).map((permission) => (
              <Badge key={permission.name} tone="info">
                {permission.name}
              </Badge>
            ))}
          </div>
        </Surface>

        <Surface className="panel">
          <SectionHeader title="Data pengawas" description="Cocokkan user login dengan master data pengawas." />
          {matchedPengawas ? (
            <div className="detail-grid">
              <DetailRow label="Nama" value={matchedPengawas.nama} />
              <DetailRow label="Jabatan" value={matchedPengawas.jabatan || '-'} />
              <DetailRow label="Telepon" value={matchedPengawas.telepon || '-'} />
              <DetailRow label="Jumlah lokasi" value={formatNumber(matchedPengawas.jumlah_lokasi ?? 0)} />
              <DetailRow label="Total pagu" value={formatCurrency(matchedPengawas.total_pagu ?? 0)} />
            </div>
          ) : (
            <EmptyState title="Belum ada kecocokan NIP" description="Pastikan data user memiliki NIP yang sama dengan master pengawas." />
          )}
        </Surface>
      </div>

      <Surface className="panel">
        <SectionHeader title="Timestamp sesi" />
        <div className="detail-grid">
          <DetailRow label="Avatar" value={String(user.avatar || '-')} />
          <DetailRow label="Gender" value={String(user.gender || '-')} />
          <DetailRow label="Diperbarui" value={formatDateTime(user.updated_at as string | undefined)} />
          <DetailRow label="Dibuat" value={formatDateTime(user.created_at as string | undefined)} />
        </div>
      </Surface>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
