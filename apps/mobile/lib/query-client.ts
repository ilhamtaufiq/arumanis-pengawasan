import { QueryClient } from '@tanstack/react-query'
import { QUERY_PERSIST_GC_TIME_MS } from '@/lib/query-persist'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: QUERY_PERSIST_GC_TIME_MS,
      retry: 1,
    },
  },
})