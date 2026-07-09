type QueryLoadState = {
  data: unknown
  isError: boolean
  isFetching: boolean
  fetchStatus: string
  isPlaceholderData: boolean
}

/** Spinner hanya saat fetch awal — bukan saat offline/paused tanpa cache. */
export function shouldShowInitialQuerySpinner(query: QueryLoadState) {
  if (query.data !== undefined) return false
  if (query.isError) return false
  if (query.fetchStatus === 'paused') return false
  return query.isFetching
}

/** Tampilkan empty/error UI ketika query tidak akan pernah resolve (mis. offline tanpa cache). */
export function shouldShowQueryEmptyFallback(query: QueryLoadState) {
  if (query.data !== undefined) return false
  if (query.isError) return true
  return query.fetchStatus === 'paused' && !query.isFetching
}