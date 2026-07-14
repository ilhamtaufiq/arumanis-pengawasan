import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { assessNetworkConnectivity } from '@/lib/network-context'
import { queryKeys } from '@pengawas/shared/query-keys'
import {
  listQueuedFotoUploads,
  listRetryableQueuedFotoUploads,
  markQueuedFotoUploadFailed,
  MAX_QUEUE_ATTEMPTS,
  purgeExhaustedQueuedFotoUploads,
  removeQueuedFotoUpload,
  buildFotoFormDataFromQueue,
  type QueuedFotoUpload,
} from '@/lib/foto-upload-queue'
import { uploadFotoWithRetry } from '@/lib/resilient-foto-upload'

export const fotoUploadQueueKey = queryKeys.fotoUploadQueue

type FotoUploadQueueContextValue = {
  items: QueuedFotoUpload[]
  pendingCount: number
  isLoading: boolean
  isSyncing: boolean
  lastSyncResult?: { processed: number; failed: number }
  flushQueue: () => void
  invalidateQueue: () => Promise<void>
}

const FotoUploadQueueContext = createContext<FotoUploadQueueContextValue | null>(null)

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return assessNetworkConnectivity(state).hasInternet
}

function useFotoUploadQueueController(enabled: boolean): FotoUploadQueueContextValue {
  const queryClient = useQueryClient()
  const processingRef = useRef(false)
  const lastFlushAtRef = useRef(0)
  const flushCooldownMs = 8_000

  const queueQuery = useQuery({
    queryKey: fotoUploadQueueKey,
    queryFn: async () => {
      await purgeExhaustedQueuedFotoUploads(MAX_QUEUE_ATTEMPTS)
      return listQueuedFotoUploads()
    },
    enabled,
    // Jangan poll agresif — cuma cek sesekali bila masih ada antrean
    refetchInterval: (query) => {
      if (!enabled) return false
      const count = query.state.data?.length ?? 0
      return count > 0 ? 45_000 : false
    },
  })

  const invalidateQueue = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: fotoUploadQueueKey })
  }, [queryClient])

  const processEntry = useCallback(
    async (entry: QueuedFotoUpload) => {
      try {
        const formData = await buildFotoFormDataFromQueue(entry)
        // Create dari antrean: 1 attempt saja (hindari duplikat di server)
        await uploadFotoWithRetry(formData, {
          maxAttempts: 1,
          fotoId: entry.replaceFotoId,
        })
        await removeQueuedFotoUpload(entry.id)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pekerjaan.detail(entry.pekerjaanId),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengunggah foto dari antrean'
        await markQueuedFotoUploadFailed(entry.id, message)
        const attempts = (entry.attempts ?? 0) + 1
        if (attempts >= MAX_QUEUE_ATTEMPTS) {
          // Stop loop: buang item yang terus gagal
          await removeQueuedFotoUpload(entry.id)
        }
        throw error
      }
    },
    [queryClient],
  )

  const flushMutation = useMutation({
    mutationFn: async () => {
      if (!enabled || processingRef.current) return { processed: 0, failed: 0 }

      const now = Date.now()
      if (now - lastFlushAtRef.current < flushCooldownMs) {
        return { processed: 0, failed: 0 }
      }
      if (!(await isOnline())) return { processed: 0, failed: 0 }

      processingRef.current = true
      lastFlushAtRef.current = now
      let processed = 0
      let failed = 0

      try {
        await purgeExhaustedQueuedFotoUploads(MAX_QUEUE_ATTEMPTS)
        const items = await listRetryableQueuedFotoUploads(MAX_QUEUE_ATTEMPTS)

        for (const entry of items) {
          try {
            await processEntry(entry)
            processed += 1
          } catch {
            failed += 1
          }
        }

        return { processed, failed }
      } finally {
        processingRef.current = false
        // Jangan invalidate di sini bila 0 item — cegah cascade re-render → re-flush
        if (processed > 0 || failed > 0) {
          await invalidateQueue()
        }
      }
    },
  })

  // Stabil: jangan masuk dependency effect lewat object mutation yang berubah tiap render
  const flushMutateRef = useRef(flushMutation.mutate)
  flushMutateRef.current = flushMutation.mutate

  const flushQueue = useCallback(() => {
    if (!enabled || processingRef.current) return
    flushMutateRef.current()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (assessNetworkConnectivity(state).hasInternet) {
        // Cooldown di dalam mutationFn — aman dipanggil
        flushQueue()
      }
    })

    return unsubscribe
  }, [enabled, flushQueue])

  // Flush sekali saat antrean baru muncul (length 0 → >0), bukan tiap re-render isPending
  const prevCountRef = useRef(0)
  useEffect(() => {
    if (!enabled) return
    const count = queueQuery.data?.length ?? 0
    const prev = prevCountRef.current
    prevCountRef.current = count
    if (count > 0 && count >= prev) {
      // Hanya flush bila ada item (termasuk item baru)
      void isOnline().then((online) => {
        if (online) flushQueue()
      })
    }
  }, [enabled, queueQuery.data?.length, flushQueue])

  return {
    items: queueQuery.data ?? [],
    pendingCount: queueQuery.data?.length ?? 0,
    isLoading: queueQuery.isLoading,
    isSyncing: flushMutation.isPending,
    lastSyncResult: flushMutation.data,
    flushQueue,
    invalidateQueue,
  }
}

export function FotoUploadQueueProvider({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) {
  const value = useFotoUploadQueueController(enabled)
  return <FotoUploadQueueContext.Provider value={value}>{children}</FotoUploadQueueContext.Provider>
}

export function useFotoUploadQueue() {
  const context = useContext(FotoUploadQueueContext)
  if (!context) {
    throw new Error('useFotoUploadQueue harus dipakai di dalam FotoUploadQueueProvider')
  }
  return context
}
