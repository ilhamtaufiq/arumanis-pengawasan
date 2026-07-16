import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Image, Text, View } from 'react-native'
import type { CollageSlotItem } from '@/lib/progress-collage'
import {
  STORY_PREVIEW_HEIGHT,
  STORY_PREVIEW_WIDTH,
  type StoryShareMeta,
} from '@/lib/story-share-meta'
import { colors, radius } from '@/theme/tokens'
import { BIDANG_AMS_INSTAGRAM } from '@/components/pekerjaan/StoryFrameCard'

const LOGO_ARUMANIS = require('../../assets/arumanis-logo.png')
const LOGO_BIDANG_AMS_ICON = require('../../assets/logo-bidang-ams-icon.png')

const amsPalette = {
  headerBg: '#1565C0',
  headerFg: '#ffffff',
  accent: '#42A5F5',
  badgeBg: '#0D47A1',
  badgeFg: '#ffffff',
  brandAccent: '#90CAF9',
  footerBg: '#0D47A1',
  surface: '#F5FAFF',
  emptyBg: '#E3F2FD',
} as const

type ProgressCollageFrameProps = {
  meta: StoryShareMeta
  slots: CollageSlotItem[]
  /** Lebar logical; HD = 1080 */
  width?: number
  /** Dipanggil sekali saat semua image terisi selesai load (atau tidak ada image) */
  onAllImagesReady?: () => void
  onImageError?: () => void
}

/**
 * Bingkai story 9:16 — kolase progress 0 / 25 / 50 / 75 / 100%.
 * Layout: header AMS · grid 2+2+1 · footer @bidang_ams
 */
export const ProgressCollageFrame = forwardRef<View, ProgressCollageFrameProps>(
  function ProgressCollageFrame(
    {
      meta,
      slots,
      width = STORY_PREVIEW_WIDTH,
      onAllImagesReady,
      onImageError,
    },
    ref,
  ) {
    const height = Math.round((width * STORY_PREVIEW_HEIGHT) / STORY_PREVIEW_WIDTH)
    const pad = Math.round(width * 0.04)
    const borderW = Math.max(3, Math.round(width * 0.011))
    const logoAruH = Math.round(width * 0.1)
    const logoAmsH = Math.round(width * 0.12)
    const gap = Math.max(4, Math.round(width * 0.018))

    const withUri = slots.filter((s) => s.imageUri)
    const needLoads = withUri.length
    const loadedRef = useRef(0)
    const readySent = useRef(false)
    const [, setTick] = useState(0)

    const notifyReady = useCallback(() => {
      if (readySent.current) return
      readySent.current = true
      onAllImagesReady?.()
    }, [onAllImagesReady])

    useEffect(() => {
      loadedRef.current = 0
      readySent.current = false
      if (needLoads === 0) {
        notifyReady()
      }
      setTick((t) => t + 1)
    }, [needLoads, slots.map((s) => s.imageUri).join('|'), notifyReady])

    const markLoaded = useCallback(() => {
      loadedRef.current += 1
      if (loadedRef.current >= needLoads) {
        notifyReady()
      }
    }, [needLoads, notifyReady])

    const row1 = slots.slice(0, 2)
    const row2 = slots.slice(2, 4)
    const row3 = slots.slice(4, 5)

    const cellH = Math.round(height * 0.17)
    const wideH = Math.round(height * 0.2)

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width,
          height,
          backgroundColor: amsPalette.surface,
          overflow: 'hidden',
          borderWidth: borderW,
          borderColor: colors.border,
        }}
      >
        {/* Header */}
        <View
          collapsable={false}
          style={{
            backgroundColor: amsPalette.headerBg,
            borderBottomWidth: borderW,
            borderBottomColor: colors.border,
            paddingHorizontal: pad,
            paddingTop: pad * 0.7,
            paddingBottom: pad * 0.65,
            gap: 5,
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
              backgroundColor: amsPalette.badgeBg,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: colors.border,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: amsPalette.badgeFg,
                fontWeight: '900',
                fontSize: Math.max(10, Math.round(width * 0.03)),
                letterSpacing: 0.4,
              }}
            >
              {meta.badge}
            </Text>
          </View>

          {meta.keteranganLine?.trim() ? (
            <Text
              numberOfLines={2}
              style={{
                fontWeight: '700',
                fontSize: Math.round(width * 0.028),
                color: '#E3F2FD',
              }}
            >
              {meta.keteranganLine.trim()}
            </Text>
          ) : null}

          {meta.title?.trim() ? (
            <Text
              numberOfLines={2}
              style={{
                fontWeight: '900',
                fontSize: Math.round(width * 0.045),
                color: amsPalette.headerFg,
                lineHeight: Math.round(width * 0.055),
              }}
            >
              {meta.title.trim()}
            </Text>
          ) : null}

          {meta.subtitle?.trim() ? (
            <Text
              numberOfLines={2}
              style={{
                fontWeight: '800',
                fontSize: Math.round(width * 0.028),
                color: amsPalette.brandAccent,
              }}
            >
              {meta.subtitle.trim()}
            </Text>
          ) : null}

          <Text
            numberOfLines={1}
            style={{
              fontWeight: '700',
              fontSize: Math.round(width * 0.026),
              color: '#E3F2FD',
            }}
          >
            {meta.locationLine}
          </Text>
        </View>

        {/* Kolase grid */}
        <View
          collapsable={false}
          style={{
            flex: 1,
            paddingHorizontal: pad,
            paddingTop: pad * 0.7,
            paddingBottom: pad * 0.4,
            gap,
          }}
        >
          <CollageRow
            items={row1}
            height={cellH}
            gap={gap}
            borderW={borderW}
            width={width}
            onLoad={markLoaded}
            onError={onImageError}
          />
          <CollageRow
            items={row2}
            height={cellH}
            gap={gap}
            borderW={borderW}
            width={width}
            onLoad={markLoaded}
            onError={onImageError}
          />
          <CollageRow
            items={row3}
            height={wideH}
            gap={gap}
            borderW={borderW}
            width={width}
            wide
            onLoad={markLoaded}
            onError={onImageError}
          />
        </View>

        {/* Footer */}
        <View
          collapsable={false}
          style={{
            marginTop: 'auto',
            backgroundColor: amsPalette.footerBg,
            borderTopWidth: borderW,
            borderTopColor: colors.border,
            paddingHorizontal: pad,
            paddingVertical: pad * 0.55,
            gap: 5,
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
                color: amsPalette.brandAccent,
                fontWeight: '900',
                fontSize: Math.round(width * 0.026),
              }}
            >
              {meta.brandLine}
            </Text>
            <View
              style={{
                backgroundColor: amsPalette.accent,
                borderWidth: 2,
                borderColor: colors.card,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontWeight: '900', fontSize: 9, color: colors.foreground }}>
                KOLASE
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: '#0A3A7A',
              borderWidth: 1.5,
              borderColor: amsPalette.brandAccent,
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
                fontSize: Math.round(width * 0.032),
              }}
            >
              {BIDANG_AMS_INSTAGRAM}
            </Text>
          </View>
        </View>
      </View>
    )
  },
)

function CollageRow({
  items,
  height,
  gap,
  borderW,
  width,
  wide = false,
  onLoad,
  onError,
}: {
  items: CollageSlotItem[]
  height: number
  gap: number
  borderW: number
  width: number
  wide?: boolean
  onLoad?: () => void
  onError?: () => void
}) {
  if (items.length === 0) return null
  return (
    <View
      collapsable={false}
      style={{
        flexDirection: 'row',
        gap,
        height,
        flex: wide ? undefined : undefined,
      }}
    >
      {items.map((item) => (
        <CollageCell
          key={item.slot}
          item={item}
          borderW={borderW}
          labelSize={Math.max(9, Math.round(width * 0.028))}
          onLoad={onLoad}
          onError={onError}
        />
      ))}
    </View>
  )
}

function CollageCell({
  item,
  borderW,
  labelSize,
  onLoad,
  onError,
}: {
  item: CollageSlotItem
  borderW: number
  labelSize: number
  onLoad?: () => void
  onError?: () => void
}) {
  const uri = item.imageUri
  return (
    <View
      collapsable={false}
      style={{
        flex: 1,
        borderWidth: borderW,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: amsPalette.emptyBg,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          resizeMethod="scale"
          onLoad={onLoad}
          onError={onError}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
          }}
        >
          <Text
            style={{
              fontWeight: '800',
              fontSize: labelSize - 1,
              color: colors.mutedForeground,
              textAlign: 'center',
            }}
          >
            Belum ada
          </Text>
        </View>
      )}
      {/* Label slot pill */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 4,
          bottom: 4,
          backgroundColor: 'rgba(13, 71, 161, 0.92)',
          borderWidth: 1.5,
          borderColor: '#fff',
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: labelSize }}>{item.slot}</Text>
      </View>
    </View>
  )
}
