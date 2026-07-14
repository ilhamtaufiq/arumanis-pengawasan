import { Platform, Share } from 'react-native'

export {
  STORY_WIDTH,
  STORY_HEIGHT,
  STORY_PREVIEW_WIDTH,
  STORY_PREVIEW_HEIGHT,
  buildStoryShareMeta,
  type StoryShareContext,
  type StoryShareMeta,
} from './story-share-meta'

function formatShareCaption(
  title: string,
  lines: Array<string | null | undefined>,
): string {
  const body = lines.map((line) => (line ?? '').trim()).filter(Boolean).join('\n')
  return [title.trim(), body, 'ARUMANIS · Pengawasan Lapangan'].filter(Boolean).join('\n')
}

/**
 * Bagikan file gambar. Prefer expo-sharing bila native tersedia;
 * fallback Share API (tanpa dependensi view-shot).
 */
export async function shareStoryImage(uri: string, message?: string) {
  const caption = message?.trim() || 'Dokumentasi lapangan Arumanis'

  try {
    // Lazy — jangan import top-level agar load modul story tidak gagal di APK tanpa native package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as {
      isAvailableAsync?: () => Promise<boolean>
      shareAsync?: (
        url: string,
        options?: { mimeType?: string; dialogTitle?: string; UTI?: string },
      ) => Promise<void>
    }
    if (typeof Sharing.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync?.(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Bagikan Story',
        UTI: 'public.png',
      })
      return
    }
  } catch {
    // lanjut fallback
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { url: uri, message: caption }
      : { message: `${caption}\n${uri}`, title: 'Bagikan Story', url: uri },
  )
}

export function buildStoryCaption(meta: {
  title: string
  locationLine?: string
  outputLine?: string
  slotLine?: string
  penerimaLine?: string | null
  pengawasLine?: string | null
  koordinatLine?: string
  tanggalLine?: string
}) {
  return formatShareCaption(meta.title, [
    meta.locationLine,
    meta.outputLine ? `Output: ${meta.outputLine}` : null,
    meta.slotLine ? `Slot: ${meta.slotLine}` : null,
    meta.penerimaLine ? `Penerima: ${meta.penerimaLine}` : null,
    meta.pengawasLine ? `Pengawas: ${meta.pengawasLine}` : null,
    meta.koordinatLine ? `GPS: ${meta.koordinatLine}` : null,
    meta.tanggalLine,
  ])
}
