import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { Foto, Output, Penerima } from '@pengawas/shared'
import { isFotoKoordinatInvalid } from '@pengawas/shared/foto-koordinat-status'
import type { FotoMatrixRow as MatrixRow } from '@/lib/pekerjaan-helpers'
import { FotoSlotTile } from '@/components/pekerjaan/FotoSlotTile'
import { colors, radius } from '@/theme/tokens'

export type UploadTarget = {
  output: Output
  slot: string
  penerima?: Penerima
}

type FotoMatrixRowCardProps = {
  row: MatrixRow
  expanded: boolean
  isBusy: boolean
  uploadingKey: string | null
  onToggle: () => void
  onOpenPreview: (foto: Foto, target: UploadTarget) => void
  onStartUpload: (target: UploadTarget, replaceFotoId?: number) => void
  onSlotLongPress: (foto: Foto, target: UploadTarget) => void
}

function rowKey(row: MatrixRow) {
  return `${row.output.id}:${row.penerima?.id ?? 0}`
}

function filledCount(row: MatrixRow) {
  return row.slots.filter((s) => Boolean(s.foto)).length
}

function invalidCount(row: MatrixRow) {
  return row.slots.filter((s) => s.foto && isFotoKoordinatInvalid(s.foto)).length
}

export const FotoMatrixRowCard = memo(function FotoMatrixRowCard({
  row,
  expanded,
  isBusy,
  uploadingKey,
  onToggle,
  onOpenPreview,
  onStartUpload,
  onSlotLongPress,
}: FotoMatrixRowCardProps) {
  const filled = filledCount(row)
  const total = row.slots.length
  const invalid = invalidCount(row)
  const complete = filled >= total

  const subtitle = row.penerima
    ? `Penerima: ${row.penerima.nama}`
    : row.output.penerima_is_optional
      ? 'Output komunal'
      : 'Tanpa penerima spesifik'

  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: expanded ? '#fffbeb' : colors.card,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 14, color: colors.foreground }}>
            {row.output.komponen}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.mutedForeground }}>
            {subtitle}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: complete ? '#dcfce7' : invalid > 0 ? '#fee2e2' : '#fef9c3',
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 11 }}>
              {filled}/{total}
              {invalid > 0 ? ` · ${invalid} GPS` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedForeground }}>
            {expanded ? 'Tutup' : 'Buka slot'}
          </Text>
        </View>
      </Pressable>

      {/* Progress strip tanpa image — murah */}
      <View style={{ flexDirection: 'row', height: 4, backgroundColor: colors.muted }}>
        {row.slots.map(({ slot, foto }) => (
          <View
            key={slot}
            style={{
              flex: 1,
              backgroundColor: !foto
                ? 'transparent'
                : isFotoKoordinatInvalid(foto)
                  ? '#dc2626'
                  : colors.accent,
            }}
          />
        ))}
      </View>

      {expanded ? (
        <View style={{ padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#e5e5e5' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {row.slots.map(({ slot, foto }) => {
              const target: UploadTarget = {
                output: row.output,
                slot,
                penerima: row.penerima,
              }
              const key = `${target.output.id}:${target.slot}:${target.penerima?.id ?? 0}`
              return (
                <FotoSlotTile
                  key={slot}
                  slot={slot}
                  foto={foto}
                  isUploading={uploadingKey === key}
                  disabled={isBusy}
                  onPress={() => {
                    if (foto) onOpenPreview(foto, target)
                    else onStartUpload(target)
                  }}
                  onLongPress={
                    foto
                      ? () => {
                          onSlotLongPress(foto, target)
                        }
                      : undefined
                  }
                />
              )
            })}
          </View>
        </View>
      ) : null}
    </View>
  )
}, (prev, next) => {
  return (
    prev.expanded === next.expanded &&
    prev.isBusy === next.isBusy &&
    prev.uploadingKey === next.uploadingKey &&
    prev.row === next.row &&
    prev.onToggle === next.onToggle
  )
})

export { rowKey as fotoMatrixRowKey }
