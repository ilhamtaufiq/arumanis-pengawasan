import { Text, View } from 'react-native'
import type { PekerjaanDetail } from '@pengawas/shared'
import { formatDateTime, formatNumber } from '@pengawas/shared/format'
import { pickText } from '@/lib/pekerjaan-helpers'
import { useResponsive } from '@/lib/responsive'
import { DetailRow } from '@/components/pekerjaan/DetailRow'
import { NeoBadge, NeoSurface, SectionHeader } from '@/components/ui'
import { colors } from '@/theme/tokens'

type RingkasanTabProps = {
  pekerjaan: PekerjaanDetail
}

export function RingkasanTab({ pekerjaan }: RingkasanTabProps) {
  const { isCompact } = useResponsive()
  const fotoList = pekerjaan.foto ?? []
  const outputList = pekerjaan.output ?? []
  const useFullWidth = isCompact

  return (
    <View style={{ gap: 16, width: '100%', minWidth: 0 }}>
      <NeoSurface style={{ gap: 12, width: '100%', minWidth: 0 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, lineHeight: 24 }}>
            Data kontrak
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
            Rekening, foto wajib, dan pembaruan terakhir
          </Text>
        </View>
        <View
          style={{
            flexDirection: isCompact ? 'column' : 'row',
            flexWrap: isCompact ? 'nowrap' : 'wrap',
            gap: 16,
            width: '100%',
            minWidth: 0,
          }}
        >
          <DetailRow label="Nomor rekening" value={pickText(pekerjaan.kode_rekening)} fullWidth={useFullWidth} />
          <DetailRow label="Foto wajib" value={pickText(pekerjaan.foto_required_count)} fullWidth={useFullWidth} />
          <DetailRow label="Diperbarui" value={formatDateTime(pekerjaan.updated_at)} fullWidth />
        </View>
      </NeoSurface>

      {outputList.length > 0 ? (
        <NeoSurface style={{ gap: 12, width: '100%', minWidth: 0 }}>
          <SectionHeader title="Output pekerjaan" description="Komponen dan ringkasan foto" />
          {outputList.map((output) => {
            const outputPhotos = fotoList.filter((item) => item.komponen_id === output.id)
            return (
              <View
                key={output.id}
                style={{
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: 6,
                  padding: 12,
                  gap: 6,
                  backgroundColor: colors.card,
                  width: '100%',
                  minWidth: 0,
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 15,
                    lineHeight: 22,
                    flexShrink: 1,
                    color: colors.foreground,
                  }}
                >
                  {output.komponen}
                </Text>
                <Text style={{ color: colors.mutedForeground, lineHeight: 20, flexShrink: 1 }}>
                  {pickText(output.volume)} {output.satuan ?? ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <NeoBadge tone={output.penerima_is_optional ? 'info' : 'neutral'}>
                    {output.penerima_is_optional ? 'Komunal' : 'Individu'}
                  </NeoBadge>
                  <NeoBadge tone="neutral">{`${formatNumber(outputPhotos.length)} foto`}</NeoBadge>
                </View>
              </View>
            )
          })}
        </NeoSurface>
      ) : null}
    </View>
  )
}