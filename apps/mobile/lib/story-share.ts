import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Clipboard from 'expo-clipboard'

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

function guessMime(uri: string, fallback = 'image/jpeg'): string {
  const lower = uri.toLowerCase().split('?')[0] ?? uri
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return fallback
}

function guessExt(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return 'jpg'
}

/**
 * Pastikan URI gambar adalah file lokal (file://).
 * HTTPS/URL publik di-download ke cache — share sheet dapat file, bukan link.
 */
export async function ensureLocalImageFile(
  uri: string,
): Promise<{ localUri: string; mimeType: string }> {
  const trimmed = uri.trim()
  if (!trimmed) {
    throw new Error('Tidak ada gambar untuk dibagikan.')
  }

  // Sudah lokal
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return { localUri: trimmed, mimeType: guessMime(trimmed) }
  }

  // data:image/...;base64,...
  if (trimmed.startsWith('data:image/')) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(trimmed)
    if (!match) throw new Error('Format data URI gambar tidak dikenali.')
    const mimeType = match[1] || 'image/jpeg'
    const base64 = match[2] || ''
    const dest = `${FileSystem.cacheDirectory}story-share-${Date.now()}.${guessExt(mimeType)}`
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })
    return { localUri: dest, mimeType }
  }

  // Remote URL → download ke file lokal (jangan share URL ke Instagram/WA)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const mimeType = guessMime(trimmed)
    const dest = `${FileSystem.cacheDirectory}story-share-${Date.now()}.${guessExt(mimeType)}`
    const result = await FileSystem.downloadAsync(trimmed, dest)
    if (result.status && result.status >= 400) {
      throw new Error('Gagal mengunduh foto untuk dibagikan.')
    }
    return {
      localUri: result.uri,
      mimeType: result.headers?.['Content-Type']?.split(';')[0]?.trim() || mimeType,
    }
  }

  // Path relatif / path tanpa scheme
  if (trimmed.startsWith('/')) {
    return { localUri: `file://${trimmed}`, mimeType: guessMime(trimmed) }
  }

  throw new Error('Sumber gambar tidak didukung untuk berbagi file.')
}

export async function copyStoryCaption(caption: string): Promise<void> {
  const text = caption.trim()
  if (!text) throw new Error('Caption kosong.')
  await Clipboard.setStringAsync(text)
}

/**
 * Bagikan FILE gambar ke share sheet (Instagram / WhatsApp Status, dll).
 * - Hanya file lokal (bukan link/URL publik di teks)
 * - Caption TIDAK digabung ke share (salin terpisah via copyStoryCaption)
 */
export async function shareStoryImageFile(uri: string): Promise<void> {
  const { localUri, mimeType } = await ensureLocalImageFile(uri)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing') as {
    isAvailableAsync?: () => Promise<boolean>
    shareAsync?: (
      url: string,
      options?: { mimeType?: string; dialogTitle?: string; UTI?: string },
    ) => Promise<void>
  }

  const available =
    typeof Sharing.isAvailableAsync === 'function' ? await Sharing.isAvailableAsync() : false

  if (!available || typeof Sharing.shareAsync !== 'function') {
    throw new Error(
      'Berbagi file tidak tersedia di perangkat ini. Perbarui aplikasi (native build) agar bisa share ke Instagram/WhatsApp.',
    )
  }

  const uti =
    mimeType === 'image/png'
      ? 'public.png'
      : mimeType === 'image/jpeg'
        ? 'public.jpeg'
        : undefined

  await Sharing.shareAsync(localUri, {
    mimeType,
    dialogTitle: 'Bagikan foto ke Story',
    ...(uti ? { UTI: uti } : {}),
    // Jangan set message/url teks — hanya file
  })
}

/** @deprecated Gunakan shareStoryImageFile + copyStoryCaption terpisah. */
export async function shareStoryImage(uri: string, _message?: string) {
  await shareStoryImageFile(uri)
  void Platform.OS
}
