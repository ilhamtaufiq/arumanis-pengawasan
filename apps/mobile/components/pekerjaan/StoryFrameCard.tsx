import { forwardRef } from 'react'
import { Image, Text, View } from 'react-native'
import {
  STORY_PREVIEW_HEIGHT,
  STORY_PREVIEW_WIDTH,
  type StoryShareMeta,
} from '@/lib/story-share-meta'
import { colors, radius } from '@/theme/tokens'

const LOGO_ARUMANIS = require('../../assets/arumanis-logo.png')
/** Ikon tetesan Bidang AMS (tanpa teks), transparan HD */
const LOGO_BIDANG_AMS_ICON = require('../../assets/logo-bidang-ams-icon.png')

/** Instagram Bidang Air Minum dan Sanitasi */
export const BIDANG_AMS_INSTAGRAM = '@bidang_ams'

/** Palet biru logo Bidang AMS — theme story ams */
const amsPalette = {
  headerBg: '#1565C0',
  headerFg: '#ffffff',
  accent: '#42A5F5',
  badgeBg: '#0D47A1',
  badgeFg: '#ffffff',
  brandAccent: '#90CAF9',
  footerBg: '#0D47A1',
  surface: '#F5FAFF',
} as const

type StoryFrameCardProps = {
  imageUri: string
  meta: StoryShareMeta
  /** Lebar logical; default preview. Capture scale ke 1080×1920. */
  width?: number
  onImageLoad?: () => void
  onImageError?: () => void
}

/**
 * Bingkai story 9:16.
 * - theme ams (kegiatan lapangan): header + FOTO besar + footer — tanpa blok output/outcome/dll.
 * - theme default: header + foto + info (dokumentasi slot).
 */
export const StoryFrameCard = forwardRef<View, StoryFrameCardProps>(function StoryFrameCard(
  { imageUri, meta, width = STORY_PREVIEW_WIDTH, onImageLoad, onImageError },
  ref,
) {
  const height = Math.round((width * STORY_PREVIEW_HEIGHT) / STORY_PREVIEW_WIDTH)
  const pad = Math.round(width * 0.045)
  const isAms = meta.theme === 'ams'
  const borderW = Math.max(3, Math.round(width * 0.012))
  const logoAruH = Math.round(width * (isAms ? 0.11 : 0.12))
  const logoAmsH = Math.round(width * 0.13)
  // AMS: foto mendominasi (~58% tinggi); default: foto + info
  const photoH = Math.round(height * (isAms ? 0.58 : 0.4))

  const headerBg = isAms ? amsPalette.headerBg : colors.main
  const headerFg = isAms ? amsPalette.headerFg : colors.foreground
  const badgeBg = isAms ? amsPalette.badgeBg : colors.foreground
  const badgeFg = isAms ? amsPalette.badgeFg : colors.main
  const canvasBg = isAms ? amsPalette.surface : colors.background
  const accentChip = isAms ? amsPalette.accent : colors.main
  const footerBg = isAms ? amsPalette.footerBg : colors.foreground
  const brandColor = isAms ? amsPalette.brandAccent : colors.main
  const slotLabel = meta.slotLabel || (isAms ? 'OUTCOME' : 'SLOT')
  const penerimaLabel = meta.penerimaLabel || 'PENERIMA'

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height,
        backgroundColor: canvasBg,
        overflow: 'hidden',
        borderWidth: borderW,
        borderColor: colors.border,
      }}
    >
      {/* Header: logos + judul kegiatan */}
      <View
        collapsable={false}
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: borderW,
          borderBottomColor: colors.border,
          paddingHorizontal: pad,
          paddingTop: pad * 0.75,
          paddingBottom: pad * 0.7,
          gap: 6,
        }}
      >
        <View
          collapsable={false}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View
            collapsable={false}
            style={{
              backgroundColor: colors.card,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              paddingHorizontal: 6,
              paddingVertical: 4,
            }}
          >
            <Image
              source={LOGO_ARUMANIS}
              style={{ width: logoAruH, height: logoAruH }}
              resizeMode="contain"
            />
          </View>

          <View
            collapsable={false}
            style={{
              backgroundColor: colors.card,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              paddingHorizontal: 6,
              paddingVertical: 4,
            }}
          >
            <Image
              source={LOGO_BIDANG_AMS_ICON}
              style={{ width: logoAmsH, height: logoAmsH }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: badgeBg,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            borderWidth: isAms ? 1.5 : 0,
            borderColor: isAms ? colors.border : 'transparent',
            maxWidth: '100%',
          }}
        >
          <Text
            numberOfLines={2}
            style={{
              color: badgeFg,
              fontWeight: '900',
              fontSize: Math.max(9, Math.round(width * 0.028)),
              letterSpacing: 0.3,
            }}
          >
            {meta.badge}
          </Text>
        </View>

        <Text
          numberOfLines={isAms ? 3 : 2}
          style={{
            fontWeight: '900',
            fontSize: Math.round(width * (isAms ? 0.052 : 0.05)),
            color: headerFg,
            lineHeight: Math.round(width * 0.062),
          }}
        >
          {meta.title}
        </Text>

        {meta.subtitle?.trim() ? (
          <Text
            numberOfLines={2}
            style={{
              fontWeight: '800',
              fontSize: Math.round(width * 0.03),
              color: isAms ? amsPalette.brandAccent : colors.foreground,
            }}
          >
            {meta.subtitle.trim()}
          </Text>
        ) : null}

        <Text
          numberOfLines={1}
          style={{
            fontWeight: '700',
            fontSize: Math.round(width * 0.028),
            color: isAms ? '#E3F2FD' : colors.foreground,
          }}
        >
          {meta.locationLine}
        </Text>
      </View>

      {/* Foto (AMS: utama; default: + panel info di bawah) */}
      <View
        collapsable={false}
        style={{
          paddingHorizontal: pad,
          paddingTop: pad * 0.85,
          flex: 1,
          paddingBottom: isAms ? pad * 0.5 : 0,
        }}
      >
        <View collapsable={false} style={{ position: 'relative', marginBottom: 4, marginRight: 4, flex: isAms ? 1 : undefined }}>
          <View
            collapsable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 5,
              left: 5,
              right: -5,
              bottom: isAms ? -5 : undefined,
              height: isAms ? undefined : photoH,
              backgroundColor: colors.foreground,
              borderRadius: radius,
            }}
          />
          <View
            collapsable={false}
            style={{
              ...(isAms ? { flex: 1, minHeight: photoH } : { height: photoH }),
              borderWidth: borderW,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.muted,
              overflow: 'hidden',
            }}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoad={onImageLoad}
                onError={onImageError}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', color: colors.mutedForeground }}>Tanpa gambar</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info detail hanya untuk dokumentasi slot (bukan kegiatan lapangan) */}
        {!isAms ? (
          <View
            collapsable={false}
            style={{ marginTop: pad * 0.55, position: 'relative', marginBottom: 4, marginRight: 4 }}
          >
            <View
              collapsable={false}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: '100%',
                height: '100%',
                backgroundColor: colors.foreground,
                borderRadius: radius,
              }}
            />
            <View
              collapsable={false}
              style={{
                backgroundColor: colors.card,
                borderWidth: borderW,
                borderColor: colors.border,
                borderRadius: radius,
                padding: pad * 0.65,
                gap: 4,
              }}
            >
              <InfoRow label="OUTPUT" value={meta.outputLine} accentColor={accentChip} />
              <InfoRow label={slotLabel} value={meta.slotLine} accent accentColor={accentChip} />
              {meta.penerimaLine ? (
                <InfoRow label={penerimaLabel} value={meta.penerimaLine} accentColor={accentChip} />
              ) : null}
              {meta.pengawasLine ? (
                <InfoRow label="PENGAWAS" value={meta.pengawasLine} accentColor={accentChip} />
              ) : null}
              <InfoRow label="KOORDINAT" value={meta.koordinatLine} accentColor={accentChip} />
              <InfoRow label="WAKTU" value={meta.tanggalLine} accentColor={accentChip} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Footer brand + @bidang_ams */}
      <View
        collapsable={false}
        style={{
          marginTop: 'auto',
          backgroundColor: footerBg,
          borderTopWidth: borderW,
          borderTopColor: colors.border,
          paddingHorizontal: pad,
          paddingVertical: pad * 0.6,
          gap: 6,
        }}
      >
        <View
          style={{
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
              color: brandColor,
              fontWeight: '900',
              fontSize: Math.round(width * 0.028),
              letterSpacing: 0.3,
            }}
          >
            {meta.brandLine}
          </Text>
          <View
            style={{
              backgroundColor: isAms ? amsPalette.accent : colors.accent,
              borderWidth: 2,
              borderColor: isAms ? colors.card : colors.main,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 9, color: colors.foreground }}>STORY</Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: isAms ? '#0A3A7A' : '#1a1a1a',
            borderWidth: 1.5,
            borderColor: brandColor,
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            alignSelf: 'flex-start',
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontWeight: '800',
              fontSize: Math.round(width * 0.034),
              letterSpacing: 0.3,
            }}
          >
            {BIDANG_AMS_INSTAGRAM}
          </Text>
        </View>
      </View>
    </View>
  )
})

function InfoRow({
  label,
  value,
  accent = false,
  accentColor = colors.main,
  maxLines = 2,
}: {
  label: string
  value: string
  accent?: boolean
  accentColor?: string
  maxLines?: number
}) {
  return (
    <View style={{ gap: 1 }}>
      <Text
        style={{
          fontSize: 8,
          fontWeight: '800',
          letterSpacing: 0.7,
          color: colors.mutedForeground,
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={maxLines}
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: colors.foreground,
          lineHeight: 16,
          backgroundColor: accent ? accentColor : 'transparent',
          alignSelf: accent ? 'flex-start' : 'stretch',
          paddingHorizontal: accent ? 5 : 0,
          paddingVertical: accent ? 2 : 0,
          borderRadius: 3,
        }}
      >
        {value}
      </Text>
    </View>
  )
}
