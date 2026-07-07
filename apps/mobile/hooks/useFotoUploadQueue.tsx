import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { assessNetworkConnectivity } from '@/lib/network-context'
import { queryKeys } from '@pengawas/shared/query-keys'
import { deleteFoto } from '@/lib/api'
import {
  buildFotoFormDataFromQueue,
  listQueuedFotoUploads,
  markQueuedFotoUploadFailed,
  removeQueuedFotoUpload,
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

  const queueQuery = useQuery({
    queryKey: fotoUploadQueueKey,
    queryFn: listQueuedFotoUploads,
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  })

  const invalidateQueue = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: fotoUploadQueueKey })
  }, [queryClient])

  const processEntry = useCallback(
    async (entry: QueuedFotoUpload) => {
      try {
        if (entry.replaceFotoId) {
          await deleteFoto(entry.replaceFotoId)
        }

        const formData = await buildFotoFormDataFromQueue(entry)
        await uploadFotoWithRetry(formData, { maxAttempts: 2 })
        await removeQueuedFotoUpload(entry.id)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pekerjaan.detail(entry.pekerjaanId),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengunggah foto dari antrean'
        await markQueuedFotoUploadFailed(entry.id, message)
        throw error
      }
    },
    [queryClient],
  )

  const flushMutation = useMutation({
    mutationFn: async () => {
      if (!enabled || processingRef.current) return { processed: 0, failed: 0 }
      if (!(await isOnline())) return { processed: 0, failed: 0 }

      processingRef.current = true
      let processed = 0
      let failed = 0

      try {
        const items = await listQueuedFotoUploads()

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
        await invalidateQueue()
      }
    },
  })

  const flushQueue = useCallback(() => {
    if (!enabled || flushMutation.isPending) return
    flushMutation.mutate()
  }, [enabled, flushMutation])

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (assessNetworkConnectivity(state).hasInternet) flushQueue()
    })

    return unsubscribe
  }, [enabled, flushQueue])

  useEffect(() => {
    if (!enabled) return
    if ((queueQuery.data?.length ?? 0) > 0) {
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