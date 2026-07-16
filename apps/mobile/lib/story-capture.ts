/**
 * Capture bingkai story ke resolusi HD (9:16 Instagram/WA).
 *
 * PENTING: ref harus mengarah ke View yang **benar-benar berukuran ~1080×1920**
 * (lihat StoryHdCaptureSurface). Jangan capture preview ~320px — opsi width/height
 * di view-shot hanya *resize bitmap*, bukan re-layout, sehingga hasil blur.
 */
import type { RefObject } from 'react'
import { Platform, type View } from 'react-native'
import * as FileSystem from 'expo-file-system'
import {
  STORY_HEIGHT,
  STORY_WIDTH,
} from '@/lib/story-share-meta'
import { ensureLocalImageFile, shareStoryImageFile } from '@/lib/story-share'

export const STORY_HD = {
  width: STORY_WIDTH,
  height: STORY_HEIGHT,
  /** JPEG max quality for share/save */
  quality: 1 as const,
  format: 'jpg' as const,
} as const

type CaptureRefFn = (
  target: RefObject<View | null> | View,
  options?: {
    format?: 'png' | 'jpg' | 'webm' | 'raw'
    quality?: number
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64'
    width?: number
    height?: number
    fileName?: string
    useRenderInContext?: boolean
  },
) => Promise<string>

export function loadStoryCaptureRef(): CaptureRefFn {
  // Lazy require — native module tidak di-load di first paint
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-view-shot') as { captureRef?: CaptureRefFn }
  if (typeof mod.captureRef !== 'function') {
    throw new Error(
      'Capture bingkai tidak tersedia. Perbarui native build agar react-native-view-shot terpasang.',
    )
  }
  return mod.captureRef
}

/** Tunggu frame layout + image decode. */
export async function waitForStoryPaint(msExtra = 0): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  if (msExtra > 0) {
    await new Promise((r) => setTimeout(r, msExtra))
  }
}

export type CaptureStoryHdOptions = {
  /** Tunggu ekstra bila image belum onLoad (ms). Default 0. */
  waitMs?: number
  /** Override quality 0–1. Default 1 (HD). */
  quality?: number
  /**
   * true = PNG lossless (teks lebih tajam, file lebih besar).
   * Default false (JPEG quality 1) — cocok Instagram.
   */
  png?: boolean
}

/**
 * Snapshot View bingkai HD → file 1080×1920.
 * Pastikan `frameRef` dari StoryHdCaptureSurface (width=1080), bukan preview.
 */
export async function captureStoryFrameHd(
  frameRef: RefObject<View | null>,
  options?: CaptureStoryHdOptions,
): Promise<string> {
  // Tunggu minimal agar Image di surface HD sempat decode (bukan cuma preview)
  const baseWait = Math.max(options?.waitMs ?? 0, 120)
  await waitForStoryPaint(baseWait)

  if (!frameRef.current) {
    throw new Error('Bingkai story HD belum siap. Tutup lalu buka lagi.')
  }

  const captureRef = loadStoryCaptureRef()
  const usePng = options?.png === true
  const quality = Math.min(1, Math.max(0.85, options?.quality ?? STORY_HD.quality))

  // width/height di sini = ukuran file akhir (downscale aman dari pixelRatio tinggi).
  // View sumber harus ~1080×1920 layout — JANGAN scale-up dari preview 320px.
  const uri = await captureRef(frameRef, {
    format: usePng ? 'png' : 'jpg',
    quality: usePng ? 1 : quality,
    result: 'tmpfile',
    width: STORY_HD.width,
    height: STORY_HD.height,
    fileName: `story-hd-${Date.now()}`,
    // iOS: kadang lebih tajam untuk view off-screen
    ...(Platform.OS === 'ios' ? { useRenderInContext: true } : {}),
  })

  if (!uri?.trim()) {
    throw new Error('Gagal merender bingkai HD.')
  }
  return uri
}

export type SaveStoryResult = {
  method: 'gallery' | 'documents'
  uri: string
}

/**
 * Simpan gambar story ke galeri perangkat (MediaLibrary).
 * Fallback: salin ke folder dokumen app bila izin/module belum siap.
 */
export async function saveStoryImageFile(uri: string): Promise<SaveStoryResult> {
  const { localUri } = await ensureLocalImageFile(uri)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const MediaLibrary = require('expo-media-library') as {
      requestPermissionsAsync?: () => Promise<{ status: string }>
      saveToLibraryAsync?: (assetUri: string) => Promise<void>
      createAssetAsync?: (localUri: string) => Promise<unknown>
    }

    if (typeof MediaLibrary.requestPermissionsAsync === 'function') {
      const perm = await MediaLibrary.requestPermissionsAsync()
      if (perm.status !== 'granted') {
        throw new Error('Izin galeri ditolak. Izinkan akses foto di pengaturan.')
      }
    }

    if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
      await MediaLibrary.saveToLibraryAsync(localUri)
      return { method: 'gallery', uri: localUri }
    }

    if (typeof MediaLibrary.createAssetAsync === 'function') {
      await MediaLibrary.createAssetAsync(localUri)
      return { method: 'gallery', uri: localUri }
    }
  } catch (e) {
    // Module belum di native build / izin ditolak → fallback file dokumen
    if (e instanceof Error && /izin galeri/i.test(e.message)) {
      throw e
    }
  }

  // Fallback: salin ke documentDirectory agar file tidak hilang di cache
  const base = FileSystem.documentDirectory
  if (!base) {
    throw new Error(
      'Tidak bisa menyimpan ke galeri. Perbarui native build (expo-media-library) atau gunakan Bagikan.',
    )
  }

  const dest = `${base}story-hd-${Date.now()}.jpg`
  await FileSystem.copyAsync({ from: localUri, to: dest })
  return { method: 'documents', uri: dest }
}

/** Capture HD lalu bagikan file. */
export async function shareStoryFrameHd(
  frameRef: RefObject<View | null>,
  options?: CaptureStoryHdOptions,
): Promise<void> {
  const framedUri = await captureStoryFrameHd(frameRef, options)
  await shareStoryImageFile(framedUri)
}

/** Capture HD lalu simpan ke galeri/dokumen. */
export async function saveStoryFrameHd(
  frameRef: RefObject<View | null>,
  options?: CaptureStoryHdOptions,
): Promise<SaveStoryResult> {
  const framedUri = await captureStoryFrameHd(frameRef, {
    ...options,
    quality: options?.quality ?? 1,
  })
  return saveStoryImageFile(framedUri)
}
