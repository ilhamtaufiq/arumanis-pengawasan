import { Text, View } from 'react-native'
import type { PekerjaanDetail } from '@pengawas/shared'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@pengawas/shared/format'
import { resolveFotoStatus, statusFotoText, statusFotoTone } from '@pengawas/shared/foto-status'
import { pickText } from '@/lib/pekerjaan-helpers'
import { useResponsive } from '@/lib/responsive'
import { DetailProgressFill } from '@/components/ui/DetailProgressFill'
import { NeoBadge, NeoSurface } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type PekerjaanDetailHeroProps = {
  pekerjaan: PekerjaanDetail
  progressValue: number
}

function HeroKpi({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.card,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}
      >
        {value}
      </Text>
    </View>
  )
}

export function PekerjaanDetailHero({ pekerjaan, progressValue }: PekerjaanDetailHeroProps) {
  const { isCompact, contentPadding } = useResponsive()
  const statusFoto = resolveFotoStatus(pekerjaan)

  const lokasiLabel = [pekerjaan.kecamatan?.nama_kecamatan, pekerjaan.desa?.nama_desa]
    .filter(Boolean)
    .join(' · ') || 'Lokasi belum diisi'

  const kegiatanLabel = pickText(
    pekerjaan.kegiatan?.nama_sub_kegiatan,
    pekerjaan.kegiatan?.nama_kegiatan,
  )
  const tahunLabel = pickText(pekerjaan.kegiatan?.tahun_anggaran)
  const pengawasLabel = pickText(pekerjaan.pengawas?.nama)
  const pendampingLabel = pickText(pekerjaan.pendamping?.nama)
  const assignmentSources = pekerjaan.assignment_sources ?? []

  const fotoCount = pekerjaan.foto?.length ?? 0
  const penerimaCount = pekerjaan.penerima?.length ?? 0
  const outputCount = pekerjaan.output?.length ?? 0

  const personnelParts: string[] = []
  if (pengawasLabel !== '-') personnelParts.push(`Pengawas: ${pengawasLabel}`)
  if (pendampingLabel !== '-') personnelParts.push(`Pendamping: ${pendampingLabel}`)
  personnelParts.push(`Dibuat ${formatDate(pekerjaan.created_at)}`)

  return (
    <NeoSurface
      tone="card"
      style={{
        marginHorizontal: contentPadding,
        marginTop: contentPadding,
        gap: 12,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        alignSelf: 'stretch',
      }}
    >
      <View style={{ gap: 8 }}>
        <Text
          numberOfLines={3}
          style={{
            fontSize: isCompact ? 18 : 22,
            fontWeight: '800',
            color: colors.foreground,
            lineHeight: isCompact ? 24 : 28,
            flexShrink: 1,
          }}
        >
          {pekerjaan.nama_paket}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <NeoBadge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</NeoBadge>
          {assignmentSources.map((source, index) => (
            <NeoBadge key={`${source}-${index}`} tone="neutral">
              {source}
            </NeoBadge>
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
          <Text style={{ fontWeight: '700' }}>Lokasi </Text>
          {lokasiLabel}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
          <Text style={{ fontWeight: '700' }}>Kegiatan </Text>
          {kegiatanLabel}
          {tahunLabel !== '-' ? ` · TA ${tahunLabel}` : ''}
        </Text>
        <View
          style={{
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isCompact ? 8 : 12,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18, flexShrink: 1 }}>
            Pagu{' '}
            <Text style={{ fontWeight: '800', color: colors.foreground }}>
              {formatCurrency(pekerjaan.pagu)}
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Progress</Text>
            <View
              style={{
                width: isCompact ? 72 : 96,
                height: 10,
                borderWidth: 2,
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <DetailProgressFill percent={progressValue} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.foreground, minWidth: 40 }}>
              {formatPercent(progressValue)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <HeroKpi label="Foto" value={formatNumber(fotoCount)} />
        <HeroKpi label="Penerima" value={formatNumber(penerimaCount)} />
        <HeroKpi label="Output" value={formatNumber(outputCount)} />
      </View>

      <Text
        style={{
          fontSize: 12,
          color: colors.mutedForeground,
          lineHeight: 18,
          borderTopWidth: 1,
          borderTopColor: 'rgba(17,17,17,0.15)',
          paddingTop: 8,
        }}
      >
        {personnelParts.join(' · ')}
      </Text>
    </NeoSurface>
  )
}