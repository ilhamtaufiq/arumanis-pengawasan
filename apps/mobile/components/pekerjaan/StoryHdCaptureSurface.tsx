import { forwardRef } from 'react'
import { View } from 'react-native'
import { StoryFrameCard } from '@/components/pekerjaan/StoryFrameCard'
import { STORY_HEIGHT, STORY_WIDTH, type StoryShareMeta } from '@/lib/story-share-meta'

type StoryHdCaptureSurfaceProps = {
  imageUri: string
  meta: StoryShareMeta
  onImageLoad?: () => void
  onImageError?: () => void
}

/**
 * Bingkai story di **ukuran asli** 1080×1920 (logical px) untuk capture.
 *
 * Jangan capture preview kecil (~320px) lalu scale ke 1080 — view-shot hanya
 * resize bitmap, hasilnya blur di Instagram Story.
 *
 * Diposisikan off-screen; collapsable=false agar native snapshot tetap merender.
 */
export const StoryHdCaptureSurface = forwardRef<View, StoryHdCaptureSurfaceProps>(
  function StoryHdCaptureSurface({ imageUri, meta, onImageLoad, onImageError }, ref) {
    return (
      <View
        pointerEvents="none"
        collapsable={false}
        style={{
          position: 'absolute',
          // Off-screen tapi masih di tree (beberapa Android skip opacity:0)
          left: -STORY_WIDTH - 40,
          top: 0,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          opacity: 1,
          overflow: 'hidden',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <StoryFrameCard
          ref={ref}
          imageUri={imageUri}
          meta={meta}
          width={STORY_WIDTH}
          onImageLoad={onImageLoad}
          onImageError={onImageError}
        />
      </View>
    )
  },
)
