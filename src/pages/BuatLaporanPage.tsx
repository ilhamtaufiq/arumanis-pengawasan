import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getPekerjaanDetail } from '@/lib/api'
import { formatPercent } from '@/lib/format'
import { PekerjaanLaporanMingguanForm } from '@/components/PekerjaanLaporanMingguanForm'
import {
  AlertModal,
  AnchorButton,
  Badge,
  DetailProgressFill,
  EmptyState,
  Spinner,
} from '@/components/ui'
import type { PekerjaanDetail } from '@/lib/types'

export function BuatLaporanPage() {
  const { pekerjaanId: rawPekerjaanId } = useParams()
  const pekerjaanId = Number(rawPekerjaanId)
  const [progressTotal, setProgressTotal] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pekerjaanQuery = useQuery({
    queryKey: ['pekerjaan', 'detail', pekerjaanId],
    queryFn: () => getPekerjaanDetail(pekerjaanId),
    enabled: Number.isFinite(pekerjaanId),
  })

  const pekerjaan = pekerjaanQuery.data as PekerjaanDetail | undefined

  if (!Number.isFinite(pekerjaanId)) {
    return (
      <EmptyState
        title="Pekerjaan tidak valid"
        description="ID pekerjaan pada URL tidak bisa dibaca."
        action={<AnchorButton variant="neutral" to="/buat-laporan">Kembali ke daftar</AnchorButton>}
      />
    )
  }

  if (pekerjaanQuery.isPending) {
    return (
      <div className="auth-page">
        <div className="neo-surface auth-card auth-card--loading">
          <Spinner />
          <div>Memuat data pekerjaan...</div>
        </div>
      </div>
    )
  }

  if (pekerjaanQuery.isError || !pekerjaan) {
    return (
      <EmptyState
        title="Gagal memuat data"
        description="Pekerjaan tidak ditemukan atau tidak dapat diakses."
        action={<AnchorButton variant="neutral" to="/buat-laporan">Kembali ke daftar</AnchorButton>}
      />
    )
  }

  return (
    <div className="stack stack--page-detail">
      <div className="detail-hero">
        <div className="detail-hero-top">
          <AnchorButton variant="neutral" to="/buat-laporan" className="neo-button--sm neo-shrink-0">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </AnchorButton>
          <h1>Buat Laporan Mingguan</h1>
        </div>

        <div className="detail-hero-meta">
          <span>{pekerjaan.nama_paket}</span>
          <span className="detail-sep">•</span>
          <span>
            {pekerjaan.kecamatan?.nama_kecamatan || '-'} • {pekerjaan.desa?.nama_desa || '-'}
          </span>
          <span className="detail-sep">•</span>
          <span>{pekerjaan.kegiatan?.nama_sub_kegiatan || '-'}</span>
          <span className="detail-sep">•</span>
          <div className="detail-progress-inline">
            <span>Progress RAB</span>
            <div className="detail-progress-track">
              <DetailProgressFill percent={progressTotal} />
            </div>
            <strong>{formatPercent(progressTotal)}</strong>
          </div>
        </div>

        <div className="detail-hero-personnel">
          <span>Pengawas: <strong>{pekerjaan.pengawas?.nama || '-'}</strong></span>
          {pekerjaan.kode_rekening ? (
            <>
              <span className="detail-sep">•</span>
              <Badge tone="neutral">{pekerjaan.kode_rekening}</Badge>
            </>
          ) : null}
        </div>
      </div>

      <PekerjaanLaporanMingguanForm
        pekerjaanId={pekerjaanId}
        onError={setErrorMessage}
        onProgressChange={setProgressTotal}
      />

      <AlertModal
        open={Boolean(errorMessage)}
        title="Laporan mingguan"
        description={errorMessage ?? undefined}
        onClose={() => setErrorMessage(null)}
      />
    </div>
  )
}