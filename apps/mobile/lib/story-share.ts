import { Platform, Share } from 'react-native'
import * as Sharing from 'expo-sharing'

export {
  STORY_WIDTH,
  STORY_HEIGHT,
  STORY_PREVIEW_WIDTH,
  STORY_PREVIEW_HEIGHT,
  buildStoryShareMeta,
  type StoryShareContext,
  type StoryShareMeta,
} from './story-share-meta'

export async function shareStoryImage(uri: string, message?: string) {
  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Bagikan Story',
      UTI: 'public.png',
    })
    return
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { url: uri, message: message ?? 'Dokumentasi lapangan Arumanis' }
      : { message: message ? `${message}\n${uri}` : uri, title: 'Bagikan Story' },
  )
}
