import { forwardRef } from 'react'
import { Image, Text, View } from 'react-native'
import type { StoryShareMeta } from '@/lib/story-share'
import { STORY_PREVIEW_HEIGHT, STORY_PREVIEW_WIDTH } from '@/lib/story-share'
import { colors, radius } from '@/theme/tokens'

type StoryFrameCardProps = {
  imageUri: string
  meta: StoryShareMeta
  /** Lebar logical; default preview. Capture pakai pixelRatio tinggi. */
  width?: number
}

/**
 * Bingkai story 9:16 — neobrutalism DESAIN.md:
 * border hitam tebal, shadow keras, aksen #ffcc00, latar #fff7e6.
 */
export const StoryFrameCard = forwardRef<View, StoryFrameCardProps>(function StoryFrameCard(
  { imageUri, meta, width = STORY_PREVIEW_WIDTH },
  ref,
) {
  const height = Math.round((width * STORY_PREVIEW_HEIGHT) / STORY_PREVIEW_WIDTH)
  const pad = Math.round(width * 0.05)
  const photoH = Math.round(height * 0.48)

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height,
        backgroundColor: colors.background,
        overflow: 'hidden',
      }}
    >
      {/* Header aksen kuning */}
      <View
        style={{
          backgroundColor: colors.main,
          borderBottomWidth: 3,
          borderBottomColor: colors.border,
          paddingHorizontal: pad,
          paddingTop: pad * 1.2,
          paddingBottom: pad * 0.85,
          gap: 6,
        }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.foreground,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: colors.main, fontWeight: '900', fontSize: 10, letterSpacing: 0.6 }}>
            {meta.badge}
          </Text>
        </View>
        <Text
          numberOfLines={3}
          style={{
            fontWeight: '900',
            fontSize: Math.round(width * 0.055),
            color: colors.foreground,
            lineHeight: Math.round(width * 0.068),
          }}
        >
          {meta.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontWeight: '700', fontSize: Math.round(width * 0.032), color: colors.foreground }}
        >
          {meta.locationLine}
        </Text>
      </View>

      {/* Foto dengan frame brutal */}
      <View style={{ paddingHorizontal: pad, paddingTop: pad, flex: 1 }}>
        <View
          style={{
            height: photoH,
            borderWidth: 3,
            borderColor: colors.border,
            borderRadius: radius,
            backgroundColor: colors.muted,
            overflow: 'hidden',
            // Shadow keras (neobrutalism) — elevation Android + offset iOS
            shadowColor: '#111111',
            shadowOffset: { width: 5, height: 5 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 6,
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', color: colors.mutedForeground }}>Tanpa gambar</Text>
            </View>
          )}
        </View>

        {/* Info pekerjaan */}
        <View
          style={{
            marginTop: pad,
            backgroundColor: colors.card,
            borderWidth: 3,
            borderColor: colors.border,
            borderRadius: radius,
            padding: pad * 0.85,
            gap: 6,
            shadowColor: '#111111',
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
          }}
        >
          <InfoRow label="OUTPUT" value={meta.outputLine} />
          <InfoRow label="SLOT" value={meta.slotLine} accent />
          {meta.penerimaLine ? <InfoRow label="PENERIMA" value={meta.penerimaLine} /> : null}
          {meta.pengawasLine ? <InfoRow label="PENGAWAS" value={meta.pengawasLine} /> : null}
          <InfoRow label="KOORDINAT" value={meta.koordinatLine} />
          <InfoRow label="WAKTU" value={meta.tanggalLine} />
        </View>
      </View>

      {/* Footer brand */}
      <View
        style={{
          marginTop: 'auto',
          backgroundColor: colors.foreground,
          paddingHorizontal: pad,
          paddingVertical: pad * 0.7,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.main,
            fontWeight: '900',
            fontSize: Math.round(width * 0.03),
            letterSpacing: 0.4,
          }}
        >
          {meta.brandLine}
        </Text>
        <View
          style={{
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.main,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontWeight: '900', fontSize: 9, color: colors.foreground }}>STORY</Text>
        </View>
      </View>
    </View>
  )
})

function InfoRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 0.8,
          color: colors.mutedForeground,
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: colors.foreground,
          backgroundColor: accent ? colors.main : 'transparent',
          alignSelf: accent ? 'flex-start' : 'stretch',
          paddingHorizontal: accent ? 6 : 0,
          paddingVertical: accent ? 2 : 0,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {value}
      </Text>
    </View>
  )
}
