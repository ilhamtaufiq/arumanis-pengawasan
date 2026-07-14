import { memo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import type { Foto } from '@pengawas/shared'
import { isFotoKoordinatInvalid } from '@pengawas/shared/foto-koordinat-status'
import { colors, radius } from '@/theme/tokens'

const TILE = 76

export type FotoSlotTileTarget = {
  outputId: number
  slot: string
  penerimaId?: number
}

type FotoSlotTileProps = {
  slot: string
  foto?: Foto
  isUploading: boolean
  disabled?: boolean
  onPress: () => void
  onLongPress?: () => void
}

/**
 * Tile slot foto — memo agar re-render row lain tidak re-decode image.
 * Hanya pakai thumb bila ada; full URL di-load saat preview.
 */
export const FotoSlotTile = memo(function FotoSlotTile({
  slot,
  foto,
  isUploading,
  disabled,
  onPress,
  onLongPress,
}: FotoSlotTileProps) {
  const invalid = Boolean(foto && isFotoKoordinatInvalid(foto))
  const uri = foto?.foto_thumb_url || foto?.foto_url || ''

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={{ width: TILE, gap: 4 }}
    >
      <View
        style={{
          width: TILE,
          height: TILE,
          borderWidth: 2,
          borderColor: invalid ? '#dc2626' : colors.border,
          borderRadius: radius,
          backgroundColor: foto ? colors.card : colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.mutedForeground }}>
            {isUploading ? '…' : '+'}
          </Text>
        )}
        {invalid ? (
          <View
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              backgroundColor: '#dc2626',
              borderRadius: 3,
              paddingHorizontal: 3,
              paddingVertical: 1,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>GPS</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontWeight: '800', fontSize: 11, textAlign: 'center' }}>{slot}</Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          color: invalid ? '#b91c1c' : colors.mutedForeground,
          textAlign: 'center',
          fontWeight: invalid ? '700' : '400',
        }}
      >
        {invalid ? 'GPS invalid' : foto ? 'Lihat' : 'Isi'}
      </Text>
    </Pressable>
  )
})
