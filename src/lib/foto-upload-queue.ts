const DB_NAME = 'arumanis-pengawas-uploads'
const DB_VERSION = 1
const STORE_NAME = 'foto-queue'

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
  fileBlob: Blob
  createdAt: string
  attempts: number
  lastError?: string
}

export type FotoUploadInput = {
  pekerjaanId: number
  komponenId: number
  komponenLabel: string
  slot: string
  penerimaId?: number
  koordinat: string
  file: File
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Gagal membuka antrean upload'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = run(store)

        request.onerror = () => reject(request.error ?? new Error('Operasi antrean upload gagal'))
        request.onsuccess = () => resolve(request.result as T)

        transaction.oncomplete = () => db.close()
        transaction.onerror = () => reject(transaction.error ?? new Error('Transaksi antrean upload gagal'))
      }),
  )
}

export function createQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function enqueueFotoUpload(input: FotoUploadInput): Promise<QueuedFotoUpload> {
  const entry: QueuedFotoUpload = {
    id: createQueueId(),
    pekerjaanId: input.pekerjaanId,
    komponenId: input.komponenId,
    komponenLabel: input.komponenLabel,
    slot: input.slot,
    koordinat: input.koordinat,
    fileName: input.file.name,
    fileType: input.file.type || 'image/jpeg',
    fileBlob: input.file,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }

  if (input.penerimaId !== undefined) {
    entry.penerimaId = input.penerimaId
  }

  await withStore('readwrite', (store) => store.put(entry))
  return entry
}

export async function listQueuedFotoUploads(): Promise<QueuedFotoUpload[]> {
  const items = await withStore<QueuedFotoUpload[]>('readonly', (store) => store.getAll())
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getQueuedFotoUploadCount(): Promise<number> {
  const items = await listQueuedFotoUploads()
  return items.length
}

export async function removeQueuedFotoUpload(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function markQueuedFotoUploadFailed(id: string, errorMessage: string): Promise<void> {
  const db = await openDb()

  try {
    const entry = await new Promise<QueuedFotoUpload | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onerror = () => reject(request.error ?? new Error('Gagal membaca antrean upload'))
      request.onsuccess = () => resolve(request.result as QueuedFotoUpload | undefined)
    })

    if (!entry) return

    const next: QueuedFotoUpload = {
      ...entry,
      attempts: entry.attempts + 1,
      lastError: errorMessage,
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(next)
      request.onerror = () => reject(request.error ?? new Error('Gagal memperbarui antrean upload'))
      request.onsuccess = () => resolve()
    })
  } finally {
    db.close()
  }
}

export function buildFotoFormDataFromQueue(entry: QueuedFotoUpload): FormData {
  const formData = new FormData()
  formData.append('pekerjaan_id', String(entry.pekerjaanId))
  formData.append('komponen_id', String(entry.komponenId))
  formData.append('keterangan', entry.slot)
  formData.append('koordinat', entry.koordinat)
  if (entry.penerimaId !== undefined) {
    formData.append('penerima_id', String(entry.penerimaId))
  }
  const file = new File([entry.fileBlob], entry.fileName, { type: entry.fileType })
  formData.append('file', file)
  return formData
}