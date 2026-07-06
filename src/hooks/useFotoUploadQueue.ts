import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { queryKeys } from '@pengawas/shared/query-keys'
import { createFoto } from '@/lib/api'
import {
  buildFotoFormDataFromQueue,
  listQueuedFotoUploads,
  markQueuedFotoUploadFailed,
  removeQueuedFotoUpload,
  type QueuedFotoUpload,
} from '@/lib/foto-upload-queue'
import { trackPengawasEvent } from '@/lib/analytics/visitor-events'

export const fotoUploadQueueKey = queryKeys.fotoUploadQueue

export function useFotoUploadQueue() {
  const queryClient = useQueryClient()
  const processingRef = useRef(false)

  const queueQuery = useQuery({
    queryKey: fotoUploadQueueKey,
    queryFn: listQueuedFotoUploads,
    refetchInterval: 15_000,
  })

  const invalidateQueue = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: fotoUploadQueueKey })
  }, [queryClient])

  const processEntry = useCallback(
    async (entry: QueuedFotoUpload) => {
      try {
        const foto = await createFoto(buildFotoFormDataFromQueue(entry))
        await removeQueuedFotoUpload(entry.id)
        void trackPengawasEvent('foto_upload', {
          pekerjaan_id: entry.pekerjaanId,
          komponen_id: entry.komponenId,
          slot: entry.slot,
          queued: true,
        })
        await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', entry.pekerjaanId] })
        return foto
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
      if (processingRef.current) return { processed: 0, failed: 0 }

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
    if (!navigator.onLine || flushMutation.isPending) return
    flushMutation.mutate()
  }, [flushMutation])

  useEffect(() => {
    const handleOnline = () => flushQueue()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [flushQueue])

  useEffect(() => {
    if ((queueQuery.data?.length ?? 0) > 0 && navigator.onLine) {
      flushQueue()
    }
  }, [queueQuery.data?.length, flushQueue])

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