import * as FileSystem from 'expo-file-system'
import * as SQLite from 'expo-sqlite'
import { appendFotoFileToFormData, type PickedImageAsset } from '@/lib/foto-upload'
import { normalizeFotoFileMeta } from '@/lib/foto-upload-meta'

const DB_NAME = 'pengawas-foto-queue.db'
const QUEUE_DIR = `${FileSystem.documentDirectory ?? ''}foto-queue/`

export type QueuedFotoUpload = {
  id: string
  pekerjaanId: number
  komponenId: number
  komponenLabel: string
  slot: string
  penerimaId?: number
  koordinat: string
  fileName: string
  fileType: string
  fileUri: string
  replaceFotoId?: number
  createdAt: string
  attempts: number
  lastError?: string
}

export type FotoUploadQueueInput = {
  pekerjaanId: number
  komponenId: number
  komponenLabel: string
  slot: string
  penerimaId?: number
  koordinat: string
  asset: PickedImageAsset
  replaceFotoId?: number
}

type QueueRow = {
  id: string
  pekerjaan_id: number
  komponen_id: number
  komponen_label: string
  slot: string
  penerima_id: number | null
  koordinat: string
  file_name: string
  file_type: string
  file_uri: string
  replace_foto_id: number | null
  created_at: string
  attempts: number
  last_error: string | null
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

export function createQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME)
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS foto_queue (
          id TEXT PRIMARY KEY NOT NULL,
          pekerjaan_id INTEGER NOT NULL,
          komponen_id INTEGER NOT NULL,
          komponen_label TEXT NOT NULL,
          slot TEXT NOT NULL,
          penerima_id INTEGER,
          koordinat TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_uri TEXT NOT NULL,
          replace_foto_id INTEGER,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );
      `)
      return db
    })()
  }

  return dbPromise
}

async function ensureQueueDir() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Penyimpanan lokal tidak tersedia di perangkat ini.')
  }

  const info = await FileSystem.getInfoAsync(QUEUE_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(QUEUE_DIR, { intermediates: true })
  }
}

function rowToEntry(row: QueueRow): QueuedFotoUpload {
  const entry: QueuedFotoUpload = {
    id: row.id,
    pekerjaanId: row.pekerjaan_id,
    komponenId: row.komponen_id,
    komponenLabel: row.komponen_label,
    slot: row.slot,
    koordinat: row.koordinat,
    fileName: row.file_name,
    fileType: row.file_type,
    fileUri: row.file_uri,
    createdAt: row.created_at,
    attempts: row.attempts,
  }

  if (row.penerima_id != null) entry.penerimaId = row.penerima_id
  if (row.replace_foto_id != null) entry.replaceFotoId = row.replace_foto_id
  if (row.last_error) entry.lastError = row.last_error

  return entry
}

async function persistAssetFile(id: string, asset: PickedImageAsset): Promise<string> {
  await ensureQueueDir()
  const { fileName, mimeType } = normalizeFotoFileMeta(asset)
  const destination = `${QUEUE_DIR}${id}-${fileName}`

  if (asset.file && typeof FileReader !== 'undefined') {
    const blob = asset.file
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('Gagal membaca file foto.'))
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('Gagal mengonversi foto ke base64.'))
          return
        }
        resolve(result.split(',')[1] ?? '')
      }
      reader.readAsDataURL(blob)
    })
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })
    return destination
  }

  await FileSystem.copyAsync({ from: asset.uri, to: destination })
  if (!mimeType) {
    return destination
  }
  return destination
}

async function deleteStoredFile(fileUri: string) {
  try {
    const info = await FileSystem.getInfoAsync(fileUri)
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true })
    }
  } catch {
    // File mungkin sudah hilang — abaikan.
  }
}

export async function enqueueFotoUpload(input: FotoUploadQueueInput): Promise<QueuedFotoUpload> {
  const id = createQueueId()
  const { fileName, mimeType } = normalizeFotoFileMeta(input.asset)
  const fileUri = await persistAssetFile(id, input.asset)
  const createdAt = new Date().toISOString()

  const entry: QueuedFotoUpload = {
    id,
    pekerjaanId: input.pekerjaanId,
    komponenId: input.komponenId,
    komponenLabel: input.komponenLabel,
    slot: input.slot,
    koordinat: input.koordinat,
    fileName,
    fileType: mimeType,
    fileUri,
    createdAt,
    attempts: 0,
  }

  if (input.penerimaId !== undefined) entry.penerimaId = input.penerimaId
  if (input.replaceFotoId !== undefined) entry.replaceFotoId = input.replaceFotoId

  const db = await getDb()
  await db.runAsync(
    `INSERT INTO foto_queue (
      id, pekerjaan_id, komponen_id, komponen_label, slot, penerima_id,
      koordinat, file_name, file_type, file_uri, replace_foto_id, created_at, attempts, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
    [
      entry.id,
      entry.pekerjaanId,
      entry.komponenId,
      entry.komponenLabel,
      entry.slot,
      entry.penerimaId ?? null,
      entry.koordinat,
      entry.fileName,
      entry.fileType,
      entry.fileUri,
      entry.replaceFotoId ?? null,
      entry.createdAt,
    ],
  )

  return entry
}

export async function listQueuedFotoUploads(): Promise<QueuedFotoUpload[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<QueueRow>('SELECT * FROM foto_queue ORDER BY created_at ASC')
  return rows.map(rowToEntry)
}

export async function getQueuedFotoUploadCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM foto_queue')
  return row?.count ?? 0
}

export async function removeQueuedFotoUpload(id: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<Pick<QueueRow, 'file_uri'>>(
    'SELECT file_uri FROM foto_queue WHERE id = ?',
    [id],
  )

  await db.runAsync('DELETE FROM foto_queue WHERE id = ?', [id])
  if (row?.file_uri) {
    await deleteStoredFile(row.file_uri)
  }
}

/** Batas retry antrean — di atas ini item dibuang (cegah loop upload ke server). */
export const MAX_QUEUE_ATTEMPTS = 2

export async function markQueuedFotoUploadFailed(id: string, errorMessage: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE foto_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    [errorMessage, id],
  )
}

export async function getQueuedFotoUploadAttempts(id: string): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ attempts: number }>(
    'SELECT attempts FROM foto_queue WHERE id = ?',
    [id],
  )
  return row?.attempts ?? 0
}

/** Item yang masih boleh dicoba (attempts < max). */
export async function listRetryableQueuedFotoUploads(
  maxAttempts = MAX_QUEUE_ATTEMPTS,
): Promise<QueuedFotoUpload[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<QueueRow>(
    'SELECT * FROM foto_queue WHERE attempts < ? ORDER BY created_at ASC',
    [maxAttempts],
  )
  return rows.map(rowToEntry)
}

/** Buang item yang sudah kelewat max attempts (bersihkan loop). */
export async function purgeExhaustedQueuedFotoUploads(
  maxAttempts = MAX_QUEUE_ATTEMPTS,
): Promise<number> {
  const db = await getDb()
  const rows = await db.getAllAsync<Pick<QueueRow, 'id' | 'file_uri'>>(
    'SELECT id, file_uri FROM foto_queue WHERE attempts >= ?',
    [maxAttempts],
  )
  for (const row of rows) {
    await db.runAsync('DELETE FROM foto_queue WHERE id = ?', [row.id])
    if (row.file_uri) await deleteStoredFile(row.file_uri)
  }
  return rows.length
}

export async function buildFotoFormDataFromQueue(entry: QueuedFotoUpload): Promise<FormData> {
  const formData = new FormData()
  formData.append('pekerjaan_id', String(entry.pekerjaanId))
  formData.append('komponen_id', String(entry.komponenId))
  formData.append('keterangan', entry.slot)
  formData.append('koordinat', entry.koordinat)

  if (entry.penerimaId !== undefined) {
    formData.append('penerima_id', String(entry.penerimaId))
  }

  await appendFotoFileToFormData(formData, {
    uri: entry.fileUri,
    mimeType: entry.fileType,
    fileName: entry.fileName,
  })

  return formData
}